document.getElementById("head1").textContent = "GroceryMate";
document.getElementById("para1").textContent = "Online Meal Prep Organization Tool";
document.getElementById("para2").textContent = "By: Nathan Nelson";

// Login
let usernameInp;
let passwordInp;
let loggedIn = false;

const made_users = [
    { username: "nathan", password: "password" }
];

document.getElementById("LogButt").onclick = function () {
    usernameInp = document.getElementById("myText").value.toLowerCase();
    passwordInp = document.getElementById("myText2").value.toLowerCase();
    validateFunc(usernameInp);

    if (loggedIn === true) {
        document.getElementById("login").style.display = "none";
        document.getElementById("buttons2").style.display = "block";
    }
};

function validateFunc(inputCheck) {
    let val   = inputCheck.trim();
    let RegEx = /^[a-z0-9.]+$/i;
    let Valid = RegEx.test(val);

    const user = made_users.find(u =>
        u.username === usernameInp &&
        u.password === passwordInp
    );

    if (Valid && user) {
        loggedIn = true;
    } else {
        console.log("Invalid credentials");
        loggedIn = false;
    }
}

// Tab switching
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