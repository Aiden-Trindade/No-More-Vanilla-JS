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
var undo_notification_timer = null;
var pending_revert_action = null;

/* ========================================== UNDO NOTIFICATION ENGINE ========================================== */

function dismiss_undo_notification() {
  var notification_banner = document.getElementById("undo-notification-banner");
  if (notification_banner) {
    notification_banner.classList.remove("Active");
  }

  if (undo_notification_timer !== null) {
    clearTimeout(undo_notification_timer);
    undo_notification_timer = null;
  }

  pending_revert_action = null;
}

function show_undo_notification(display_text, revert_action_function) {
  var notification_banner = document.getElementById("undo-notification-banner");
  var notification_text = document.getElementById("undo-notification-text");

  if (!notification_banner || !notification_text) {
    return;
  }

  notification_text.innerText = display_text;

  if (typeof revert_action_function === "function") {
    pending_revert_action = revert_action_function;
  } else {
    pending_revert_action = null;
  }

  notification_banner.classList.add("Active");

  if (undo_notification_timer !== null) {
    clearTimeout(undo_notification_timer);
  }

  undo_notification_timer = setTimeout(function() {
    dismiss_undo_notification();
  }, 5000);
}

function recalculate_and_refresh_dashboard() {
  calculate_total_spent();
  render_recent_activity();
  render_donut_chart();
  render_week_bar_chart();
}

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
  show_undo_notification('Removed "' + cat_name + '"', function() {
    if (last_deleted_item === null) {
      return;
    }

    var custom_list = get_custom_categories();
    custom_list.splice(last_deleted_item.index, 0, last_deleted_item.item);
    save_custom_categories(custom_list);

    selected_category = last_deleted_item.item.name;
    last_deleted_item = null;

    render_all_chips();
  });
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
  if (input_wrap) {
    input_wrap.style.display = "none";
  }
}

function submit_spend() {
  var amount_input = document.getElementById("spend-amount-input");
  var note_input = document.getElementById("spend-note-input");

  var amount = Number(parseFloat(amount_input.value));
  var title = note_input.value.trim();

  if (title === "") {
    title = selected_category;
  }

  if (isNaN(amount) || amount <= 0) {
    alert("Enter a valid amount");
    return;
  }

  var new_tx = {
    id: Date.now(),
    amount: amount,
    category: selected_category,
    memo: title,
    timestamp: new Date().toISOString()
  };

  var history = get_history();
  history.unshift(new_tx);
  save_history(history);

  recalculate_and_refresh_dashboard();

  var removed_tx_id = new_tx.id;
  show_undo_notification('Removed "' + title + '"', function() {
    var current_history = get_history();
    var remaining_history = [];
    var index = 0;

    while (index < current_history.length) {
      var current_item = current_history[index];
      if (current_item.id !== removed_tx_id) {
        remaining_history.push(current_item);
      }
      index = index + 1;
    }

    save_history(remaining_history);
    recalculate_and_refresh_dashboard();
  });

  amount_input.value = "";
  note_input.value = "";
  close_spend_sheet();
}

// Wire Event Listeners
document.addEventListener("DOMContentLoaded", function() {
  render_all_chips();
  calculate_total_spent(); 
  render_recent_activity();
  render_donut_chart();
  render_week_bar_chart();
  

  var undo_notification_button = document.getElementById("undo-notification-button");
  if (undo_notification_button) {
    undo_notification_button.addEventListener("click", function() {
      if (typeof pending_revert_action === "function") {
        pending_revert_action();
      }
      dismiss_undo_notification();
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

// --- STORAGE: TRANSACTIONS ---

function get_history() {
  var raw = localStorage.getItem("ledger_history");
  if (raw !== null) {
    return JSON.parse(raw);
  }
  return [];
}

function save_history(list) {
  localStorage.setItem("ledger_history", JSON.stringify(list));
}


// --- MATH: TOTAL SPENT ---

function calculate_total_spent() {
  var history = get_history();
  var total = 0;

  for (var i = 0; i < history.length; i++) {
    total = total + history[i].amount;
  }

  var display = document.getElementById("total-spent-display");
  if (display) {
    display.innerText = total.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}


// --- RENDER: RECENT ACTIVITY ---
function get_category_color(cat_name) {
  for (var i = 0; i < PRESET_CATEGORIES.length; i++) {
    if (PRESET_CATEGORIES[i].name === cat_name) {
      return null;
    }
  }

  var custom_list = get_custom_categories();
  for (var j = 0; j < custom_list.length; j++) {
    if (custom_list[j].name === cat_name) {
      return custom_list[j].color; 
    }
  }

  return "#8e8e93";
}

function format_tx_datetime(iso_str) {
  var d = new Date(iso_str);
  var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var month = months[d.getMonth()];
  var day = d.getDate();
  var time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  return month + " " + day + ", " + time;
}

function render_recent_activity() {
  var list_box = document.getElementById("recent-tx-list");
  if (!list_box) return;

  var history = get_history();
  list_box.innerHTML = "";

  if (history.length === 0) {
    list_box.innerHTML = '<div class="Empty_State_Row" style="padding: 20px; text-align: center; font-family: monospace; font-size: 11px; color: #71717a; border: 1px dashed rgba(255,255,255,0.08); border-radius: 8px;">// no_transactions_logged.txt</div>';
    return;
  }

  // Strictly enforce top 4 latest records
  var slice = history.slice(0, 4);

  for (var i = 0; i < slice.length; i++) {
    var tx = slice[i];
    var custom_color = get_category_color(tx.category);

    var dot_markup = "";
    if (custom_color) {
      dot_markup = '<span class="Tx_Dot" style="background-color: ' + custom_color + ';"></span>';
    } else {
      dot_markup = '<span class="Tx_Dot Seg_' + tx.category + '_Bg"></span>';
    }

    var time_sub = tx.category + " • " + format_tx_datetime(tx.timestamp);

    var row = document.createElement("div");
    row.className = "Tx_Row_Item";

    row.innerHTML =
      '<div class="Tx_Left_Meta">' +
        dot_markup +
        '<div class="Tx_Identity">' +
          '<span class="Tx_Name">' + tx.memo + '</span>' +
          '<span class="Tx_Sub_Info">' + time_sub + '</span>' +
        '</div>' +
      '</div>' +
      '<span class="Tx_Outflow_Val">-₹' + tx.amount.toFixed(2) + '</span>';

    list_box.appendChild(row);
  }
}

//Maths etc about the Donut Chart and Top 4

function render_donut_chart() {
  var svg = document.getElementById("donut-svg");
  var legend = document.getElementById("category-legend-list");
  var badge = document.getElementById("donut-badge-text");
  if (!svg || !legend) return;

  var history = get_history();
  svg.innerHTML = "";
  legend.innerHTML = "";

  if (history.length === 0) {
    if (badge) badge.innerText = "0 TX";
    svg.innerHTML = '<circle cx="50" cy="50" r="38" fill="none" stroke="#27272a" class="Donut_Path" stroke-dasharray="2 4" />';
    legend.innerHTML = '<div style="font-family: monospace; font-size: 11px; color: #71717a; padding: 24px 0;">// no_outflow_logged.txt</div>';
    return;
  }

  if (badge) {
    badge.innerText = history.length + " TX";
  }

  // 1. Group totals per category
  var totals = {};
  var total_spent = 0;

  for (var i = 0; i < history.length; i++) {
    var item = history[i];
    total_spent = total_spent + item.amount;
    if (!totals[item.category]) {
      totals[item.category] = 0;
    }
    totals[item.category] = totals[item.category] + item.amount;
  }

  // 2. Sort categories by highest spend
  var sorted_cats = Object.keys(totals).sort(function(a, b) {
    return totals[b] - totals[a];
  });

  // 3. Strict Top 4: Top 3 + "Other"
  var chart_items = [];
  var max_slices = 4;

  if (sorted_cats.length <= max_slices) {
    for (var k = 0; k < sorted_cats.length; k++) {
      chart_items.push({
        name: sorted_cats[k],
        spend: totals[sorted_cats[k]],
        color: get_category_color(sorted_cats[k])
      });
    }
  } else {
    for (var t = 0; t < 3; t++) {
      chart_items.push({
        name: sorted_cats[t],
        spend: totals[sorted_cats[t]],
        color: get_category_color(sorted_cats[t])
      });
    }

    var other_spend = 0;
    for (var r = 3; r < sorted_cats.length; r++) {
      other_spend = other_spend + totals[sorted_cats[r]];
    }

    chart_items.push({
      name: "Other",
      spend: other_spend,
      color: "#ec4899"
    });
  }

  var circumference = 2 * Math.PI * 38;
  var accumulated_offset = 0;

  // Preset hex fallback lookup in case class names fail
  var preset_hex_map = {
    Dining: "#e5484d",
    Housing: "#46a758",
    Transit: "#3e63dd",
    Supplies: "#eab308",
    Misc: "#8e8e93"
  };

  // 4. Render slices & legend
  for (var j = 0; j < chart_items.length; j++) {
    var entry = chart_items[j];
    var fraction = entry.spend / total_spent;
    var slice_length = fraction * circumference;

    // Resolve color safely
    var slice_color = entry.color || preset_hex_map[entry.name] || "#ec4899";

    var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "50");
    circle.setAttribute("cy", "50");
    circle.setAttribute("r", "38");
    circle.setAttribute("class", "Donut_Path");
    circle.setAttribute("stroke", slice_color);

    if (chart_items.length === 1) {
      circle.removeAttribute("stroke-dasharray");
      circle.removeAttribute("stroke-dashoffset");
    } else {
      circle.setAttribute(
        "stroke-dasharray",
        slice_length.toFixed(3) + " " + (circumference - slice_length).toFixed(3)
      );
      circle.setAttribute("stroke-dashoffset", (-accumulated_offset).toFixed(3));
    }

    svg.appendChild(circle);
    accumulated_offset = accumulated_offset + slice_length;

    // Legend Row
    var row = document.createElement("div");
    row.className = "Legend_Row";
    row.innerHTML =
      '<div class="Legend_Left">' +
        '<span class="Legend_Dot" style="background-color: ' + slice_color + ';"></span>' +
        '<span class="Legend_Title">' + entry.name + '</span>' +
      '</div>' +
      '<span class="Legend_Price">₹' + entry.spend.toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }) + '</span>';

    legend.appendChild(row);
  }
}

// --- RENDER: THIS WEEK BAR GRAPH ---

function render_week_bar_chart() {
  var frame = document.getElementById("week-bar-chart-frame");
  var total_stat = document.getElementById("week-total-stat");
  if (!frame) return;

  var history = get_history();

  // Keep the baseline line element, clear existing columns
  frame.innerHTML = '<div class="Bar_Chart_Baseline"></div>';

  var now = new Date();
  // In JS: Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
  // Convert so Mon=0, Tue=1, ..., Sun=6
  var current_day_idx = (now.getDay() + 6) % 7;

  // Find Monday of the current week at 00:00:00
  var monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - current_day_idx);
  monday.setHours(0, 0, 0, 0);

  var day_labels = ["M", "T", "W", "T", "F", "S", "S"];
  var week_days = [];

  // Build 7 date slots for Monday -> Sunday
  for (var i = 0; i < 7; i++) {
    var d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, "0");
    var dd = String(d.getDate()).padStart(2, "0");
    var key = yyyy + "-" + mm + "-" + dd;

    week_days.push({
      date_key: key,
      label: day_labels[i],
      total: 0,
      is_today: (i === current_day_idx)
    });
  }

  // Aggregate spending from history for this week
  var week_total_spend = 0;

  for (var j = 0; j < history.length; j++) {
    var tx = history[j];
    var tx_date = tx.timestamp.split("T")[0];

    for (var k = 0; k < week_days.length; k++) {
      if (week_days[k].date_key === tx_date) {
        week_days[k].total += tx.amount;
        week_total_spend += tx.amount;
        break;
      }
    }
  }

  // Update header total
  if (total_stat) {
    total_stat.innerText = "₹" + week_total_spend.toLocaleString("en-IN", {
      maximumFractionDigits: 0
    }) + " TOTAL";
  }

  // Find the peak day for proportional scaling
  var max_spend = 0;
  for (var m = 0; m < week_days.length; m++) {
    if (week_days[m].total > max_spend) {
      max_spend = week_days[m].total;
    }
  }

  // Render the 7 bar columns
  for (var n = 0; n < week_days.length; n++) {
    var day = week_days[n];
    var height_percent = max_spend > 0 ? (day.total / max_spend) * 100 : 0;

    // Use at least 4% height if money was spent so tiny amounts are visible
    if (day.total > 0 && height_percent < 4) {
      height_percent = 4;
    }

    var col = document.createElement("div");
    col.className = "Bar_Column";

    var fill_classes = "Bar_Fill" + (day.is_today ? " Bar_Highlight" : "");
    var label_classes = "Day_Label" + (day.is_today ? " Active_Day" : "");

    col.innerHTML =
      '<div class="Bar_Track">' +
        '<div class="' + fill_classes + '" style="height: ' + height_percent.toFixed(1) + '%;"></div>' +
      '</div>' +
      '<span class="' + label_classes + '">' + day.label + '</span>';

    frame.appendChild(col);
  }
}