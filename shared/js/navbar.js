// quick handler for mobile capsule clicks

function toggle_nav(force_close) {
  var capsule_wrap = document.getElementById("capsule-wrap");
  var screen_mask = document.getElementById("screen-mask");

  if (!capsule_wrap){
     return;
  }

  var is_open = capsule_wrap.classList.contains("Menu_Open");

  if (force_close === true || is_open) {
    capsule_wrap.classList.remove("Menu_Open");
    if (screen_mask) screen_mask.classList.remove("Is_Shown");
  } else {
    capsule_wrap.classList.add("Menu_Open");
    if (screen_mask) screen_mask.classList.add("Is_Shown");
  }
}

// pull current date

function run_date_stamp() {
  var target = document.getElementById("date-box");
  if (!target) {
    return;
  }
  
  var d = new Date();
  var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  var text = days[d.getDay()] + ", " + months[d.getMonth()] + " " + d.getDate() + ", " + d.getFullYear();
  target.innerText = text;
}

window.onload = function() {
  run_date_stamp();
};