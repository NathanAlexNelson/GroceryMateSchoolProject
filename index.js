document.getElementById("head1").textContent = "GroceryMate";
document.getElementById("para1").textContent = "Online Meal Prep Organization Tool";
document.getElementById("para2").textContent = "By: Nathan Nelson";

//Login Function
let usernameInp;
let passwordInp;
let loggedIn = false;

//Calendar Function
let newX = 0, newY = 0, startX = 0, startY = 0;
const card = document.getElementById('card')

const made_users = [
    { username: "nathan", password: "password" }
];

LogButt.onclick = function(){
    usernameInp = document.getElementById("myText").value.toLowerCase();
    passwordInp = document.getElementById("myText2").value.toLowerCase();
    validateFunc(usernameInp);

    if (loggedIn == true){
        console.log("Test")
        login.style.display = "none";
        buttons2.style.display = "block";
    }
}

// Function to validate alphanumeric input
function validateFunc(inputCheck) {
    let val = inputCheck.trim(); 
    let RegEx = /^[a-z0-9.]+$/i; 
    let Valid = RegEx.test(val);

    const user = made_users.find(u => 
        u.username === usernameInp && 
        u.password === passwordInp
    );
    
    if (Valid && user) {
        loggedIn = true;
    }
    else {
        console.log("Invalid credentials");
        loggedIn = false;
    }
}

function groceryTab(evt, tabName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("defaultTab").click();
});

//Calendar Card dragging
card.addEventListener('mousedown', mouseDown)

function mouseDown(e){
    startX = e.clientX
    startY = e.clientY

    document.addEventListener('mousemove', mouseMove)
    document.addEventListener('mouseup', mouseUp)
}

function mouseMove(e){
    newX = startX - e.clientX 
    newY = startY - e.clientY 
  
    startX = e.clientX
    startY = e.clientY

    card.style.top = (card.offsetTop - newY) + 'px'
    card.style.left = (card.offsetLeft - newX) + 'px'
}

function mouseUp(e){
    document.removeEventListener('mousemove', mouseMove)
}