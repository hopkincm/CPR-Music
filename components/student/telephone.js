export default function TelephoneActivity() {
  return <>
    <h2>Telephone</h2>
    <div className="container">
      <div className="row">
        <div class="col Melody"><button id="Melody" onclick="window.location.href='performMelody.html';">Melody</button></div>
        <div class="col Baseline"><button id="Baseline" onclick="window.location.href='performBaseline.html';">Bassline</button></div>
        <div class="col Creative"><button id="Creative" onclick="window.location.href='performCreative.html';">Creative</button></div>
      </div>
      <div className="row"><button id="Response" onclick="window.location.href='response.html';">Response</button></div>
    </div>

  </>

};