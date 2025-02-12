/* eslint-disable camelcase */
import { signOut } from 'next-auth/react';
import * as types from './types';


// https://allover.twodee.org/remote-state/fetching-memories/
function assertResponse(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  }
  throw new Error(`${response.status}: ${response.statusText}`);
}

export function gotRoster(enrollments) {
  return {
    type: types.Action.GotRoster,
    payload: enrollments,
  };
}

export function gotEnrollments(courses) {
  return {
    type: types.Action.GotEnrollments,
    payload: courses,
  };
}

export function retrieveEnrollments(djangoToken) {
  return fetch(`${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/enrollments/`, {
    headers: {
      Authorization: `Token ${djangoToken}`,
      'Content-Type': 'application/json',
    },
  }).then((response, ...rest) => {
    const results = response.json();
    return results;
  });
}

export function fetchEnrollments() {
  return (dispatch, getState) => {
    const { currentUser: {token} } = getState();
    return token
      ? retrieveEnrollments(token)
        .then((courses) => dispatch(gotEnrollments(courses)))
        .catch((...rest) => {
          console.log('catch rest');
          console.log(rest);
        })
      : null;
  };
}

export const newCourse =
  ({
    name,
    startDate: start_date,
    endDate: end_date,
    slug = 'slug',
    userId,
  }) =>
    async(dispatch, getState) => {
      const {
        currentUser: { token }
      } = getState();
      const params = {
        name,
        start_date,
        end_date,
        slug,
        owner: userId,
      };
      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(params),
      };

      const enrollOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${token}`,
        },
      };
      var newSlug;
      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/courses/`, options)
        .then(assertResponse)
        .then((response) => response.json())
        .then((data) => {
          const enrollParams = {
            user: userId,
            role: 1,
            course: data.id,
          };
          newSlug = data.slug;
          enrollOptions.body = JSON.stringify(enrollParams);
          return fetch(
            `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/enrollments/`,
            enrollOptions
          );
        })
        .then(() => dispatch(fetchEnrollments()));
      return newSlug;
    };

export function addedFromRoster(courseSlug, enrollments) {
  return {
    type: types.Action.AddedRoster,
    payload: {
      courseSlug,
      enrollments,
    },
  };
}

export function fetchRoster({ courseSlug }) {
  return (dispatch, getState) => {
    const {
      currentUser: { token },
    } = getState();
    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/courses/${courseSlug}/roster/`,
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )
      .then((response) => response.json())
      .then((enrollments) => dispatch(gotRoster(enrollments)));
  };
}

export function uploadRoster({ body, courseSlug }) {
  return (dispatch, getState) => {
    const {
      currentUser: { token }
    } = getState();
    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/courses/${courseSlug}/roster/`,
      {
        headers: {
          Authorization: `Token ${token}`,
        },
        method: 'POST',
        body,
      }
    )
      .then(assertResponse)
      .then((response) => response.json())
      .then((res) => {
        dispatch(addedFromRoster(courseSlug, res));
      })
      .then(() =>
        dispatch(fetchRoster({ djangoToken: token, courseSlug }))
      );
  }
}

export function gotInstruments(instruments) {
  return {
    type: types.Action.GotInstruments,
    payload: instruments,
  };
}

export function fetchInstruments() {
  return (dispatch, getState) => {
    const {
      currentUser: { token },
    } = getState();
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/instruments/`, {
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(assertResponse)
      .then((response) => response.json())
      .then((instruments) => 
        dispatch(
          gotInstruments(instruments.sort((a, b) => (a.name < b.name ? -1 : 1)))
        )
      );
  }
}



export function enrollmentUpdated({ enrollment, instrument }) {
  return {
    type: types.Action.UpdatedEnrollmentInstrument,
    payload: {
      enrollment,
      instrument,
    },
  };
}

export function setInstrumentActivity(enrollmentId, activityState) {
  return {
    type: types.Action.SetInstrumentActive,
    payload: { enrollmentId, activityState },
  };
}

export function updateEnrollmentInstrument({
  enrollmentId,
  instrument,
}) {
  return (dispatch, getState) => {
    const {
      currentUser: { token },
    } = getState();
    dispatch(setInstrumentActivity(enrollmentId, types.ActivityState.Active));
    return fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/enrollments/${enrollmentId}/`,
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
        body: JSON.stringify({ instrument: instrument.id }),
      }
    )
      .then(assertResponse)
      .then((res) => res.json())
      .then((enrollment) => {
        dispatch(
          setInstrumentActivity(enrollmentId, types.ActivityState.Success)
        );
        dispatch(enrollmentUpdated({ enrollment, instrument }));
      })
      .catch(() => {
        dispatch(
          setInstrumentActivity(enrollmentId, types.ActivityState.Erroneous)
        );
      });
  };
}

export function gotAssignments(assignments) {
  return {
    type: types.Action.GotAssignments,
    payload: assignments,
  };
}

export function fetchStudentAssignments({ slug }) {
  return (dispatch, getState) => {
    const {
      currentUser: { token },
    } = getState();
    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/courses/${slug}/assignments/`,
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )
      .then((response) => response.json())
      .then((assignments) => dispatch(gotAssignments(assignments)));
  }
}

export function loggedOut() {
  return {
    type: types.Action.LoggedOut,
  };
}

export function logoutUser() {
  return (dispatch, getState) => {
    const {
      currentUser: { token },
    } = getState();
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_HOST}/auth-token`, {
      method: 'DELETE',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(assertResponse)
      .then((res) => res.json())
      .then(loggedOut);
  }
}

export function gotActivities({ activities, slug }) {
  return {
    type: types.Action.GotActivities,
    payload: {
      activities,
      slug,
    },
  };
}

export function fetchActivities({ slug }) {
  return (dispatch, getState) => {
    const {
      currentUser: { token },
    } = getState();
    return token && fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/courses/${slug}/assignments/`,
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )
      .then(assertResponse)
      .then((response) => response.json())
      .then((activities) => dispatch(gotActivities({ activities, slug })))
      .catch((e) => {
        console.error('caught', e)
      });
  }
}

export function gotPieces(pieces) {
  return {
    type: types.Action.GotPieces,
    payload: pieces,
  };
}

export function fetchPieces() {
  return (dispatch, getState) => {
    const {
      currentUser: { token },
    } = getState();
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/pieces/`, {
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(assertResponse)
      .then((response) => response.json())
      .then((pieces) => {
        dispatch(gotPieces(pieces.sort((a, b) => (a.name < b.name ? -1 : 1))));
      });
  }
}

export function assignedPiece({ piece, slug }) {
  return {
    type: types.Action.AssignedPiece,
    payload: { piece, slug },
  };
}

export function unassignedPiece({ piece, slug }) {
  return {
    type: types.Action.UnassignedPiece,
    payload: { piece, slug },
  };
}

export function assignPiece({ slug, piece }) {
  return (dispatch, getState) => {
    const {
      currentUser: { token },
    } = getState();
    // const data = new FormData();
    // data.append("piece_id", piece);
    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/courses/${slug}/assign/`,
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ piece_id: piece.id }),
        // body: data,
      }
    )
      .then(assertResponse)
      .then((response) => response.json())
      .then((pieceResponse) => dispatch(assignedPiece({ piece, slug })));
  }
}

export function setPieceChangeState({ piece, state }) {
  return {
    type: types.Action.SetPieceChangeState,
    payload: { piece, state },
  };
}

export function unassignPiece({ piece, slug }) {
  return (dispatch, getState) => {
    const {
      currentUser: { token },
    } = getState();
    dispatch(
      setPieceChangeState({
        pieceId: piece.id,
        state: types.ActivityState.Active,
      })
    );
    // const data = new FormData();
    // data.append("piece_id", piece);
    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/courses/${slug}/unassign/`,
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({ piece_id: piece.id }),
        // body: data,
      }
    )
      .then(assertResponse)
      .then(() => dispatch(unassignedPiece({ piece, slug })))
      .then(() =>
        dispatch(
          setPieceChangeState({
            pieceId: piece.id,
            state: types.ActivityState.Success,
          })
        )
      )
      .catch((err) => {
        dispatch(
          setPieceChangeState({
            pieceId: piece.id,
            state: types.ActivityState.Erroneous,
          })
        );
      });
  };
}

export function gotUser(userInfo) {
  return {
    type: types.Action.HaveUser,
    payload: userInfo,
  };
}

export function gotMyProfile(myProfile) {
  return {
    type: types.Action.GotProfile,
    payload: myProfile,
  };
}

export function getUserProfile() {
  return (dispatch, getState) => {
    const {
      currentUser: { token },
    } = getState();
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/users/me/`, {
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then(assertResponse)
      .then((response, ...rest) => {
        const results = response.json();
        return results;
      })
      .then((myProfile) => dispatch(gotMyProfile(myProfile)))
      .catch((err) => {
        if (err?.message.includes('403')) {
          signOut({ callbackUrl: '/' });
        }
      });
  }
}

export function selectEnrollment(enrollment) {
  return {
    type: types.Action.SelectedEnrollment,
    payload: enrollment,
  };
}

export function selectAssignment(assignment) {
  return {
    type: types.Action.SelectedAssignment,
    payload: assignment,
  };
}

export function beginUpload(id) {
  console.log('begin upload', id);
  return {
    type: types.Action.BeginUpload,
    payload: {id}
  };
}

export function uploadSucceeded(id) {
  return {
    type: types.Action.UploadSucceeded,
    payload: { id },
  };
}
export function uploadDone(id) {
  return {
    type: types.Action.UploadFinished,
    payload: { id },
  };
}

export function uploadFailed(id) {
  return {
    type: types.Action.UploadFailed,
    payload: { id },
  };
}


export function postRecording({
  slug,
  assignmentId,
  audio,
  composition,
  submissionId,
}) {
  console.log(
    'postRecording',
    slug,
    assignmentId,
    audio,
    composition,
    submissionId
  );
  return (dispatch, getState) => {
    const {
      currentUser: { token },
    } = getState();

    dispatch(beginUpload(submissionId));
    let body = '{"content":"N/A for Perform submissions"}';
    if (composition) {
      body = JSON.stringify({ content: composition });
    }
    return fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/courses/${slug}/assignments/${assignmentId}/submissions/`,
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body,
      }
    )
      .then(assertResponse)
      .then((res) => res.json())
      .then((submission) => {
        fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/courses/${slug}/assignments/${assignmentId}/submissions/${submission.id}/attachments/`,
          {
            headers: {
              Authorization: `Token ${token}`,
            },
            method: 'POST',
            body: audio,
          }
        )
          .then(assertResponse)
          .then((response) => response.json())
          .then((res) => {
          });
      })
      .then(() => {
        // success case
        dispatch(uploadSucceeded(submissionId));
        const p = new Promise((resolve) => {
          setTimeout(() => resolve, 1000);
        });
        return p;
      })
      .then(() => {
        dispatch(uploadDone(submissionId));
      })
      .catch((err) => {
        dispatch(uploadFailed(submissionId));
      });
  };
}

export function postRespond({ slug, assignmentId, response }) {
  return (dispatch, getState) => {
    const {
      currentUser: { token },
    } = getState();
    dispatch(beginUpload(assignmentId));
    const body = JSON.stringify({ content: JSON.stringify(response) });
    return fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/courses/${slug}/assignments/${assignmentId}/submissions/`,
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body,
      }
    )
      .then(assertResponse)
      .then((res) => res.json())
      .then((submission) => {
        console.log('new submission', submission);
      })

      .then(() => {
        // success case
        dispatch(uploadSucceeded(assignmentId));
        const p = new Promise((resolve) => {
          setTimeout(() => resolve, 1000);
        });
        return p;
      })
      .then(() => {
        dispatch(uploadDone(assignmentId));
      })
      .catch((err) => {
        dispatch(uploadFailed(assignmentId));
      });
  };
}

export function postConnect({ slug, assignmentId, response }) {
  return (dispatch, getState) => {
    const {
      currentUser: { token },
    } = getState();
    dispatch(beginUpload(assignmentId));
    const body = JSON.stringify({ content: response });
    return fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/courses/${slug}/assignments/${assignmentId}/submissions/`,
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body,
      }
    )
      .then(assertResponse)
      .then((res) => res.json())
      .then((submission) => {
        console.log('new submission', submission);
      })
      .then(() => {
        // success case
        dispatch(uploadSucceeded(assignmentId));
        const p = new Promise((resolve) => {
          setTimeout(() => resolve, 1000);
        });
        return p;
      })
      .then(() => {
        dispatch(uploadDone(assignmentId));
      })
      .catch((err) => {
        dispatch(uploadFailed(assignmentId));
      });
  };
}


export function gotSingleStudentAssignment(assignment) {
  return {
    type: types.Action.GotSingleAssignment,
    payload: assignment,
  };
}

export function fetchSingleStudentAssignment({ slug, assignmentId }) {
  return (dispatch, getState) => {
    const {
      currentUser: { token },
    } = getState();
    fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_HOST}/api/courses/${slug}/assignments/${assignmentId}/`,
      {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )
      .then(assertResponse)
      .then((response) => response.json())
      .then((assignment) => dispatch(selectAssignment(assignment)));
  }
}

export function didInstrument() {
  console.log('action didInstrument');
  return {
    type: types.Action.DidInstrument,
  };
}