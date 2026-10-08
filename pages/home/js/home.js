// home root js
var is_ready = true;
console.log("home view loaded:", is_ready);

// --- LOG SPEND SHEET LOGIC ---

var PRESET_CATEGORIES = [
  { name: "Dining", dotClass: "Dot_Dining" },
  { name: "Housing", dotClass: "Dot_Housing" },
  { name: "Transit", dotClass: "Dot_Transit" },
  { name: "Supplies", dotClass: "Dot_Supplies" },
  { name: "Misc", dotClass: "Dot_Misc" }
];

var COLOR_CYCLE = [
  "#06b6d4", 
  "#a855f7", 
  "#eab308", 
  "#ec4899", 
  "#10b981", 
  "#e5484d", 
  "#46a758", 
  "#3e63dd", 
  "#e54d2e",
  "#8e8e93"  
];

var selected_category = "Dining";
var last_deleted_item = null;
var undo_timer = null;

function get_custom_categories() {
  var stored = localStorage.getItem("ledger_custom_cats_v3");
  if (stored !== null) {
    return JSON.parse(stored);
  } else {
    return [];
  }
}

function save_custom_categories(list) {
  localStorage.setItem("ledger_custom_cats_v3", JSON.stringify(list));
}

function get_next_palette_color(index) {
  var total_colors = COLOR_CYCLE.length;
  var color_position = index % total_colors;
  return COLOR_CYCLE[color_position];
}

function render_all_chips() {
  var grid = document.getElementById("cat-chip-grid");
  if (!grid) return;
  grid.innerHTML = "";

  // 1. Presets
  for (var i = 0; i < PRESET_CATEGORIES.length; i++) {
    var preset = PRESET_CATEGORIES[i];
    var chip = document.createElement("button");
    chip.type = "button";

    var class_names = "Cat_Chip";
    if (selected_category === preset.name) {
      class_names = class_names + " Is_Selected";
    }
    chip.className = class_names;
    chip.setAttribute("data-cat", preset.name);

    chip.innerHTML = '<span class="Chip_Dot ' + preset.dotClass + '"></span><span class="Chip_Text">' + preset.name + '</span>';

    (function(category_name) {
      chip.addEventListener("click", function() {
        select_category(category_name);
      });
    })(preset.name);

    grid.appendChild(chip);
  }

  // 2. Persistent Custom Chips
  var custom_list = get_custom_categories();
  for (var j = 0; j < custom_list.length; j++) {
    var item = custom_list[j];
    var custom_chip = document.createElement("button");
    custom_chip.type = "button";

    var custom_classes = "Cat_Chip";
    if (selected_category === item.name) {
      custom_classes = custom_classes + " Is_Selected";
    }
    custom_chip.className = custom_classes;
    custom_chip.setAttribute("data-cat", item.name);

    custom_chip.innerHTML = '<span class="Chip_Dot" style="background-color: ' + item.color + ';"></span>' +
                            '<span class="Chip_Text">' + item.name + '</span>' +
                            '<span class="Chip_Del_Trigger" title="Delete category">&times;</span>';

    (function(category_item) {
      custom_chip.addEventListener("click", function(event) {
        if (event.target.classList.contains("Chip_Del_Trigger")) {
          return;
        }
        select_category(category_item.name);
      });

      var del_btn = custom_chip.querySelector(".Chip_Del_Trigger");
      del_btn.addEventListener("click", function(event) {
        event.stopPropagation();
        delete_category(category_item.name);
      });
    })(item);

    grid.appendChild(custom_chip);
  }

  // 3. + Custom Trigger
  var add_btn = document.createElement("button");
  add_btn.type = "button";
  add_btn.className = "Cat_Chip Add_Custom_Chip_Btn";
  add_btn.id = "add-custom-chip-btn";
  add_btn.innerHTML = '<span>+</span><span>Create</span>';
  add_btn.addEventListener("click", function() {
    toggle_custom_input();
  });
  grid.appendChild(add_btn);
}

function select_category(cat_name) {
  selected_category = cat_name;
  var input_wrap = document.getElementById("custom-cat-input-wrap");
  if (input_wrap) input_wrap.style.display = "none";
  render_all_chips();
}

function toggle_custom_input() {
  var wrap = document.getElementById("custom-cat-input-wrap");
  var field = document.getElementById("custom-cat-field");
  wrap.style.display = "flex";
  field.value = "";
  field.focus();
}

function confirm_custom_category() {
  var field = document.getElementById("custom-cat-field");
  var val = field.value.trim();

  if (val === "") return;

  var is_duplicate = false;
  for (var i = 0; i < PRESET_CATEGORIES.length; i++) {
    if (PRESET_CATEGORIES[i].name.toLowerCase() === val.toLowerCase()) {
      is_duplicate = true;
      break;
    }
  }

  var custom_list = get_custom_categories();
  for (var j = 0; j < custom_list.length; j++) {
    if (custom_list[j].name.toLowerCase() === val.toLowerCase()) {
      is_duplicate = true;
      break;
    }
  }

  if (is_duplicate === true) {
    select_category(val);
    return;
  }

  var assigned_color = get_next_palette_color(custom_list.length);
  var new_item = {
    name: val,
    color: assigned_color
  };

  custom_list.push(new_item);
  save_custom_categories(custom_list);
  select_category(val);
}

function delete_category(cat_name) {
  var custom_list = get_custom_categories();
  var found_index = -1;

  for (var i = 0; i < custom_list.length; i++) {
    if (custom_list[i].name === cat_name) {
      found_index = i;
      break;
    }
  }

  if (found_index === -1) return;

  last_deleted_item = {
    item: custom_list[found_index],
    index: found_index
  };

  custom_list.splice(found_index, 1);
  save_custom_categories(custom_list);

  if (selected_category === cat_name) {
    selected_category = "Dining";
  }

  render_all_chips();
  trigger_undo_toast(cat_name);
}

function trigger_undo_toast(cat_name) {
  var toast = document.getElementById("undo-toast");
  var text = document.getElementById("undo-toast-text");
  text.innerText = 'Removed "' + cat_name + '"';

  toast.classList.add("Is_Visible");

  if (undo_timer !== null) {
    clearTimeout(undo_timer);
  }

  undo_timer = setTimeout(function() {
    toast.classList.remove("Is_Visible");
    last_deleted_item = null;
  }, 4500);
}

// Open / Close Drawer
function open_spend_sheet() {
  document.getElementById("spend-sheet-backdrop").classList.add("Is_Open");
  document.getElementById("spend-sheet").classList.add("Is_Open");
  setTimeout(function() {
    document.getElementById("spend-amount-input").focus();
  }, 150);
}

function close_spend_sheet() {
  document.getElementById("spend-sheet-backdrop").classList.remove("Is_Open");
  document.getElementById("spend-sheet").classList.remove("Is_Open");
  var input_wrap = document.getElementById("custom-cat-input-wrap");
  if (input_wrap) input_wrap.style.display = "none";
  var toast = document.getElementById("undo-toast");
  if (toast) toast.classList.remove("Is_Visible");
}

function submit_spend() {
  var amount_input = document.getElementById("spend-amount-input");
  var note_input = document.getElementById("spend-note-input");

  var amount = parseFloat(amount_input.value);
  var title = note_input.value.trim();

  if (title === "") {
    title = selected_category;
  }

  if (isNaN(amount) || amount <= 0) {
    alert("Enter a valid amount");
    return;
  }

  alert("Recorded: ₹" + amount.toFixed(2) + " under [" + selected_category + "] for " + title);

  amount_input.value = "";
  note_input.value = "";
  close_spend_sheet();
}

// Wire Event Listeners
document.addEventListener("DOMContentLoaded", function() {
  render_all_chips();

  var undo_btn = document.getElementById("undo-action-btn");
  if (undo_btn) {
    undo_btn.addEventListener("click", function() {
      if (last_deleted_item === null) return;

      var custom_list = get_custom_categories();
      custom_list.splice(last_deleted_item.index, 0, last_deleted_item.item);
      save_custom_categories(custom_list);

      selected_category = last_deleted_item.item.name;
      last_deleted_item = null;

      if (undo_timer !== null) {
        clearTimeout(undo_timer);
      }
      document.getElementById("undo-toast").classList.remove("Is_Visible");

      render_all_chips();
    });
  }

  var custom_field = document.getElementById("custom-cat-field");
  if (custom_field) {
    custom_field.addEventListener("keydown", function(event) {
      if (event.key === "Enter") {
        event.preventDefault();
        confirm_custom_category();
      }
    });
  }

  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
      close_spend_sheet();
    }
  });
});