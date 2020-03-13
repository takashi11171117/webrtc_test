const landingPageDiv = document.querySelector("#landingPage");
const patientEntryDiv = document.querySelector("#patientEntry");
const doctorSignupDiv = document.querySelector("#doctorSignup");
const videoPageDiv = document.querySelector("#videoPage");

const patientName = document.querySelector("#patientName");
const doctorName = document.querySelector("#doctorName");
const doctorSpecialty = document.querySelector("#doctorSpecialty");
const enterAsPatient = document.querySelector("#enterAsPatient");
const requestDoctor = document.querySelector("#requestDoctor");
const requestDoctorForm = document.querySelector("#requestDoctorForm");
const waitingForDoctor = document.querySelector("#waitingForDoctor");
const waitingForDoctorProgress = document.querySelector("#waitingForDoctorProgress");
const doctorSignupForm = document.querySelector("#doctorSignupForm");
const doctorSignupButton = document.querySelector("#doctorSignupButton");
const waitingForPatient = document.querySelector("#waitingForPatient");
const doctorListing = document.querySelector("#doctorListing");
const callDoctor = document.querySelector("#callDoctor");
const enterAsDoctor = document.querySelector("#enterAsDoctor");

enterAsPatient.addEventListener('click', function(ev){
  landingPageDiv.style.display = 'none';
  patientEntryDiv.style.display = 'block';
  doctorSignupDiv.style.display = 'none';
  videoPageDiv.style.display = 'none';

  myUserType = "patient";
  requestDoctorForm.style.display = 'block';
  waitingForDoctor.style.display = 'none';
  doctorListing.style.display = 'none';
  ev.preventDefault();
}, false);

requestDoctor.addEventListener('click', function(ev){
  requestDoctorForm.style.display = 'none';
  waitingForDoctor.style.display = 'block';
  doctorListing.style.display = 'none';

  patientUserName = patientName.value || 'no name';
  myName = patientUserName;
  socket.emit('signal',
    {
      user_type: "patient",
      user_name: patientUserName,
      user_data: "no data, just a patient",
      command: "joinroom"
    }
  );
  console.log("patient " + patientUserName + " has joined.");
  ev.preventDefault();
}, false);

enterAsDoctor.addEventListener('click', function(ev){
  landingPageDiv.style.display = 'none';
  patientEntryDiv.style.display = 'none';
  doctorSignupDiv.style.display = 'block';
  videoPageDiv.style.display = 'none';

  myUserType = "doctor";
  doctorSignupForm.style.display = 'block';
  waitingForPatient.style.display = 'none';
  ev.preventDefault();
}, false);

doctorSignupButton.addEventListener('click', function(ev){
  doctorSignupForm.style.display = 'none';
  waitingForPatient.style.display = 'block';

  doctorUserName = doctorName.value || 'no name';
  myName = doctorUserName;
  socket.emit(
    'signal',
    {
      user_type: "doctor",
      user_name: doctorUserName,
      user_data: doctorSpecialty.value,
      command: "joinroom"
    }
  );
  console.log("Dr. " + doctorUserName + " has joined.");
  ev.preventDefault();
}, false);

callDoctor.addEventListener('click', function(ev){
  landingPageDiv.style.display = 'none';
  patientEntryDiv.style.display = 'none';
  videoPageDiv.style.display = 'block';

	patientUserName = patientName.value || 'no name';
  socket.emit('signal',
    {
      user_type: "patient",
      user_name: patientUserName,
      user_data: "calling doctor",
      command: "calldoctor"
    }
  );
	console.log("patient " + patientUserName + " is calling.");
	if (!pc) startSignaling();
  ev.preventDefault();
}, false);

