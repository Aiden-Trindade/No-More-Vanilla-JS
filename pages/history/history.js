// history page js

/* ==========================================================================
   GLOBAL STATE
   ========================================================================== */
var ledger_history_storage_key = "ledger_history";
var ledger_custom_cats_storage_key = "ledger_custom_cats_v3";

var selected_range_days = "30";
var active_transaction_for_detail = null;

var undo_notification_timer = null;
var pending_revert_action = null;

var weekday_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var month_names = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// same preset colours the dashboard uses for its dots
var preset_category_colors = {
  Food: "#ef4444",
  Dining: "#ef4444",
  Housing: "#46a758",
  Transit: "#3e63dd",
  Shopping: "#10b981",
  Entertainment: "#8b5cf6",
  Supplies: "#e54d2e",
  Misc: "#8e8e93",
  Other: "#ec4899"
};

/* ==========================================================================
   STORAGE
   ========================================================================== */
function normalize_history_record(raw_record) {
  var safe_record = raw_record;
  if (!safe_record) {
    safe_record = {};
  }

  var record_timestamp = safe_record.timestamp;
  if (!record_timestamp) {
    record_timestamp = safe_record.date;
  }
  if (!record_timestamp) {
    record_timestamp = new Date().toISOString();
  }

  var record_amount = Number(safe_record.amount);
  if (isNaN(record_amount)) {
    record_amount = 0;
  }

  var record_category = safe_record.category;
  if (!record_category) {
    record_category = "General";
  }

  var record_memo = safe_record.memo;
  if (!record_memo) {
    record_memo = "";
  }

  return {
    id: safe_record.id,
    amount: record_amount,
    category: String(record_category),
    memo: String(record_memo),
    timestamp: String(record_timestamp)
  };
}

function fetch_transaction_history_from_storage() {
  var raw_data = localStorage.getItem(ledger_history_storage_key);
  if (raw_data === null) {
    return [];
  }

  try {
    var parsed_records = JSON.parse(raw_data);
    if (!Array.isArray(parsed_records)) {
      return [];
    }

    var normalized_records = [];
    for (var i = 0; i < parsed_records.length; i = i + 1) {
      normalized_records.push(normalize_history_record(parsed_records[i]));
    }
    return normalized_records;
  } catch (error) {
    console.error("Failed to parse transaction history:", error);
    return [];
  }
}

function save_transaction_history_to_storage(records_array) {
  var records_to_save = [];

  for (var i = 0; i < records_array.length; i = i + 1) {
    records_to_save.push(normalize_history_record(records_array[i]));
  }

  localStorage.setItem(ledger_history_storage_key, JSON.stringify(records_to_save));
}

function fetch_custom_categories_from_storage() {
  var raw_data = localStorage.getItem(ledger_custom_cats_storage_key);
  if (raw_data === null) {
    return [];
  }

  try {
    var parsed_list = JSON.parse(raw_data);
    if (Array.isArray(parsed_list)) {
      return parsed_list;
    }
    return [];
  } catch (error) {
    console.error("Failed to parse custom categories:", error);
    return [];
  }
}

function resolve_category_color(category_name) {
  var normalized_category_name = String(category_name);
  if (normalized_category_name === "Dining") {
    normalized_category_name = "Food";
  }

  if (preset_category_colors[normalized_category_name]) {
    return preset_category_colors[normalized_category_name];
  }

  var custom_list = fetch_custom_categories_from_storage();
  for (var i = 0; i < custom_list.length; i = i + 1) {
    if (custom_list[i].name === normalized_category_name) {
      return String(custom_list[i].color);
    }
  }

  if (preset_category_colors[category_name]) {
    return preset_category_colors[category_name];
  }

  return "#8e8e93";
}

/* ==========================================================================
   LOCAL DATE + NUMBER FORMATTERS (local time only, no UTC drift)
   ========================================================================== */
function generate_local_date_key(date_object) {
  var year_number = date_object.getFullYear();
  var month_number = Number(date_object.getMonth() + 1);
  var day_number = Number(date_object.getDate());

  var formatted_month = String(month_number);
  if (month_number < 10) {
    formatted_month = "0" + formatted_month;
  }

  var formatted_day = String(day_number);
  if (day_number < 10) {
    formatted_day = "0" + formatted_day;
  }

  return String(year_number) + "-" + formatted_month + "-" + formatted_day;
}

function format_friendly_local_date(date_object) {
  var day_name = weekday_names[date_object.getDay()];
  var month_name = month_names[date_object.getMonth()];
  var day_number = date_object.getDate();
  var year_number = date_object.getFullYear();

  return day_name + ", " + month_name + " " + String(day_number) + ", " + String(year_number);
}

function format_local_time(date_object) {
  var hours_number = date_object.getHours();
  var minutes_number = date_object.getMinutes();
  var period = "AM";

  if (hours_number >= 12) {
    period = "PM";
  }
  if (hours_number > 12) {
    hours_number = hours_number - 12;
  }
  if (hours_number === 0) {
    hours_number = 12;
  }

  var formatted_minutes = String(minutes_number);
  if (minutes_number < 10) {
    formatted_minutes = "0" + formatted_minutes;
  }

  return String(hours_number) + ":" + formatted_minutes + " " + period;
}

function format_currency_amount(amount_value) {
  return Number(amount_value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/* ==========================================================================
   FILTERING
   ========================================================================== */
function calculate_range_start_time(range_value) {
  if (String(range_value) === "all") {
    return null;
  }

  // start of today (local) minus the previous days in the range
  var range_days = Number(range_value);
  var now = new Date();
  var start_date = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - (range_days - 1)
  );
  start_date.setHours(0, 0, 0, 0);

  return start_date.getTime();
}

function build_filtered_transactions() {
  var all_transactions = fetch_transaction_history_from_storage();
  var range_start_time = calculate_range_start_time(selected_range_days);
  var filtered_transactions = [];

  for (var i = 0; i < all_transactions.length; i = i + 1) {
    var item = all_transactions[i];

    if (range_start_time === null) {
      filtered_transactions.push(item);
    } else {
      var item_time = new Date(item.timestamp).getTime();
      if (item_time >= range_start_time) {
        filtered_transactions.push(item);
      }
    }
  }

  // newest first
  filtered_transactions.sort(function(item_a, item_b) {
    var time_a = new Date(item_a.timestamp).getTime();
    var time_b = new Date(item_b.timestamp).getTime();

    if (time_b !== time_a) {
      return time_b - time_a;
    }
    return Number(item_b.id) - Number(item_a.id);
  });

  return filtered_transactions;
}

/* ==========================================================================
   RENDERING
   ========================================================================== */
function build_transaction_card(entry) {
  var entry_date = new Date(entry.timestamp);

  var card = document.createElement("div");
  card.className = "Transaction_Item_Card";
  card.setAttribute("data-id", String(entry.id));
  card.setAttribute("role", "button");
  card.setAttribute("tabindex", "0");

  var left_col = document.createElement("div");
  left_col.className = "Item_Left_Col";

  var dot = document.createElement("span");
  dot.className = "Item_Dot";
  dot.style.backgroundColor = resolve_category_color(entry.category);

  var identity = document.createElement("div");
  identity.className = "Item_Identity";

  var primary_note = document.createElement("span");
  primary_note.className = "Item_Primary_Note";
  if (entry.memo.trim() !== "") {
    primary_note.textContent = entry.memo;
  } else {
    primary_note.textContent = entry.category;
  }

  var meta_info = document.createElement("span");
  meta_info.className = "Item_Meta_Details";
  meta_info.textContent = entry.category + " \u2022 " + format_local_time(entry_date);

  identity.appendChild(primary_note);
  identity.appendChild(meta_info);
  left_col.appendChild(dot);
  left_col.appendChild(identity);

  var amount_text = document.createElement("span");
  amount_text.className = "Item_Amount_Text";
  amount_text.textContent = "-\u20B9" + format_currency_amount(entry.amount);

  card.appendChild(left_col);
  card.appendChild(amount_text);

  card.addEventListener("click", function() {
    open_transaction_detail_sheet(entry);
  });

  card.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      open_transaction_detail_sheet(entry);
    }
  });

  return card;
}

function render_history_view() {
  var container = document.getElementById("transaction-timeline-container");
  var total_spend_display = document.getElementById("history-total-spend");
  var count_display = document.getElementById("history-tx-count");
  if (!container || !total_spend_display) {
    return;
  }

  var filtered_transactions = build_filtered_transactions();

  // period total + count
  var total_period_spend = 0;
  for (var j = 0; j < filtered_transactions.length; j = j + 1) {
    total_period_spend = total_period_spend + Number(filtered_transactions[j].amount);
  }
  total_spend_display.textContent = format_currency_amount(total_period_spend);

  if (count_display) {
    count_display.textContent = String(filtered_transactions.length) + " TX";
  }

  container.innerHTML = "";

  if (filtered_transactions.length === 0) {
    var empty_notice = document.createElement("div");
    empty_notice.className = "Empty_State_Notice";
    empty_notice.textContent = "// no_transactions_in_period.txt";
    container.appendChild(empty_notice);
    return;
  }

  // group by local calendar day (already sorted newest first)
  var grouped_by_day = {};
  var date_keys_in_order = [];

  for (var k = 0; k < filtered_transactions.length; k = k + 1) {
    var record = filtered_transactions[k];
    var date_key = generate_local_date_key(new Date(record.timestamp));

    if (!grouped_by_day[date_key]) {
      grouped_by_day[date_key] = [];
      date_keys_in_order.push(date_key);
    }
    grouped_by_day[date_key].push(record);
  }

  for (var g = 0; g < date_keys_in_order.length; g = g + 1) {
    var current_key = date_keys_in_order[g];
    var records_in_group = grouped_by_day[current_key];
    var sample_date = new Date(records_in_group[0].timestamp);

    var group_total = 0;
    for (var m = 0; m < records_in_group.length; m = m + 1) {
      group_total = group_total + Number(records_in_group[m].amount);
    }

    var group_block = document.createElement("div");
    group_block.className = "Day_Group_Block";

    var group_header = document.createElement("div");
    group_header.className = "Day_Group_Header";

    var header_title = document.createElement("span");
    header_title.className = "Day_Group_Date";
    header_title.textContent = format_friendly_local_date(sample_date);

    var header_subtotal = document.createElement("span");
    header_subtotal.className = "Day_Group_Subtotal";
    header_subtotal.textContent = "\u20B9" + format_currency_amount(group_total);

    group_header.appendChild(header_title);
    group_header.appendChild(header_subtotal);
    group_block.appendChild(group_header);

    var list_wrapper = document.createElement("div");
    list_wrapper.className = "Transaction_List";

    for (var r = 0; r < records_in_group.length; r = r + 1) {
      list_wrapper.appendChild(build_transaction_card(records_in_group[r]));
    }

    group_block.appendChild(list_wrapper);
    container.appendChild(group_block);
  }
}

/* ==========================================================================
   DETAIL SHEET
   ========================================================================== */
function open_transaction_detail_sheet(transaction_object) {
  active_transaction_for_detail = transaction_object;

  var tx_date = new Date(transaction_object.timestamp);

  var amount_el = document.getElementById("detail-field-amount");
  var category_el = document.getElementById("detail-field-category");
  var category_dot_el = document.getElementById("detail-field-category-dot");
  var note_el = document.getElementById("detail-field-note");
  var day_el = document.getElementById("detail-field-day");
  var date_el = document.getElementById("detail-field-date");
  var time_el = document.getElementById("detail-field-time");

  amount_el.textContent = format_currency_amount(transaction_object.amount);
  category_el.textContent = transaction_object.category;
  category_dot_el.style.backgroundColor = resolve_category_color(transaction_object.category);

  if (transaction_object.memo.trim() !== "") {
    note_el.textContent = transaction_object.memo;
  } else {
    note_el.textContent = "No note attached";
  }

  day_el.textContent = weekday_names[tx_date.getDay()];
  date_el.textContent = format_friendly_local_date(tx_date);
  time_el.textContent = format_local_time(tx_date);

  document.getElementById("detail-sheet-backdrop").classList.add("Is_Open");
  document.getElementById("detail-sheet").classList.add("Is_Open");
}

function close_transaction_detail_sheet() {
  var backdrop = document.getElementById("detail-sheet-backdrop");
  var sheet = document.getElementById("detail-sheet");

  if (backdrop) {
    backdrop.classList.remove("Is_Open");
  }
  if (sheet) {
    sheet.classList.remove("Is_Open");
  }
  active_transaction_for_detail = null;
}

function handle_delete_transaction() {
  if (!active_transaction_for_detail) {
    return;
  }

  var target_to_delete = active_transaction_for_detail;
  var current_records = fetch_transaction_history_from_storage();
  var updated_records = [];
  var removed_index = -1;

  for (var i = 0; i < current_records.length; i = i + 1) {
    if (String(current_records[i].id) === String(target_to_delete.id)) {
      removed_index = i;
    } else {
      updated_records.push(current_records[i]);
    }
  }

  if (removed_index === -1) {
    close_transaction_detail_sheet();
    return;
  }

  save_transaction_history_to_storage(updated_records);
  close_transaction_detail_sheet();
  render_history_view();

  var notification_label = target_to_delete.memo;
  if (notification_label.trim() === "") {
    notification_label = target_to_delete.category;
  }

  show_undo_notification('Removed "' + notification_label + '"', function() {
    restore_deleted_transaction(target_to_delete, removed_index);
  });
}

function restore_deleted_transaction(restored_record, original_index) {
  var records = fetch_transaction_history_from_storage();

  // do not restore twice
  for (var i = 0; i < records.length; i = i + 1) {
    if (String(records[i].id) === String(restored_record.id)) {
      return;
    }
  }

  var insert_position = Number(original_index);
  if (insert_position > records.length) {
    insert_position = records.length;
  }

  records.splice(insert_position, 0, restored_record);
  save_transaction_history_to_storage(records);
  render_history_view();
}

/* ==========================================================================
   UNDO NOTIFICATION ENGINE (same logic as home.js)
   ========================================================================== */
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

  notification_text.textContent = display_text;

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

/* ==========================================================================
   FILTER CHIPS
   ========================================================================== */
function set_active_range_chip(range_value) {
  var chips = document.querySelectorAll(".Filter_Chip");

  for (var i = 0; i < chips.length; i = i + 1) {
    if (String(chips[i].getAttribute("data-range")) === String(range_value)) {
      chips[i].classList.add("Is_Active");
    } else {
      chips[i].classList.remove("Is_Active");
    }
  }
}

/* ==========================================================================
   INIT
   ========================================================================== */
document.addEventListener("DOMContentLoaded", function() {
  render_history_view();

  // capsule nav (toggle_nav lives in shared/js/navbar.js)
  var capsule_button = document.getElementById("capsule-btn");
  if (capsule_button) {
    capsule_button.addEventListener("click", function() {
      toggle_nav();
    });
  }

  var screen_mask = document.getElementById("screen-mask");
  if (screen_mask) {
    screen_mask.addEventListener("click", function() {
      toggle_nav(true);
    });
  }

  // range chips
  var chips = document.querySelectorAll(".Filter_Chip");
  for (var i = 0; i < chips.length; i = i + 1) {
    (function(chip_element) {
      chip_element.addEventListener("click", function() {
        selected_range_days = String(chip_element.getAttribute("data-range"));
        set_active_range_chip(selected_range_days);
        render_history_view();
      });
    })(chips[i]);
  }

  // detail sheet
  var close_sheet_button = document.getElementById("detail-close-btn");
  if (close_sheet_button) {
    close_sheet_button.addEventListener("click", function() {
      close_transaction_detail_sheet();
    });
  }

  var sheet_backdrop = document.getElementById("detail-sheet-backdrop");
  if (sheet_backdrop) {
    sheet_backdrop.addEventListener("click", function() {
      close_transaction_detail_sheet();
    });
  }

  var delete_button = document.getElementById("detail-delete-btn");
  if (delete_button) {
    delete_button.addEventListener("click", function() {
      handle_delete_transaction();
    });
  }

  // undo button
  var undo_notification_button = document.getElementById("undo-notification-button");
  if (undo_notification_button) {
    undo_notification_button.addEventListener("click", function() {
      if (typeof pending_revert_action === "function") {
        pending_revert_action();
      }
      dismiss_undo_notification();
    });
  }

  document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
      close_transaction_detail_sheet();
    }
  });
});