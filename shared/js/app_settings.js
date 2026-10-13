var app_settings_valid_theme_list = [
  "theme_dark_cool",
  "theme_dark_warm",
  "theme_bright_cool",
  "theme_bright_warm"
];

var app_settings_default_theme_str = "theme_dark_warm";
var app_settings_default_name_str = "User";
var app_settings_default_category_name_list = [
  "Food",
  "Transit",
  "Housing",
  "Shopping",
  "General"
];
var app_settings_history_key_list = [
  "ledger_history",
  "expense_tracker_history"
];
var app_settings_custom_category_storage_key_str = "ledger_custom_cats_v3";
var app_settings_preferences_key_str = "expense_tracker_preferences";
var app_settings_username_key_str = "expense_tracker_username";

function Read_Json_From_Storage(storage_key_arg_str, fallback_value_arg) {
  var raw_value_str = localStorage.getItem(storage_key_arg_str);
  if (raw_value_str === null) {
    return fallback_value_arg;
  }

  try {
    return JSON.parse(raw_value_str);
  } catch (error_obj) {
    console.error("Could not parse " + storage_key_arg_str + ":", error_obj);
    return fallback_value_arg;
  }
}

function Apply_Saved_Theme() {
  var preferences_obj = Read_Json_From_Storage(app_settings_preferences_key_str, {});
  var theme_name_str = app_settings_default_theme_str;

  if (preferences_obj && typeof preferences_obj === "object") {
    if (typeof preferences_obj.theme === "string") {
      if (app_settings_valid_theme_list.indexOf(preferences_obj.theme) !== -1) {
        theme_name_str = String(preferences_obj.theme);
      }
    }
  }

  for (var i = 0; i < app_settings_valid_theme_list.length; i = i + 1) {
    document.body.classList.remove(app_settings_valid_theme_list[i]);
  }

  document.body.classList.add(theme_name_str);
  return theme_name_str;
}

function Resolve_Category_Color(category_name_arg) {
  var category_name_str = String(category_name_arg || "");
  var category_map_obj = {
    Food: "#ef4444",
    Transit: "#3b82f6",
    Housing: "#10b981",
    Shopping: "#8b5cf6",
    General: "#64748b"
  };

  if (category_map_obj[category_name_str]) {
    return category_map_obj[category_name_str];
  }

  var custom_category_list = Read_Json_From_Storage(app_settings_custom_category_storage_key_str, []);
  if (Array.isArray(custom_category_list)) {
    for (var i = 0; i < custom_category_list.length; i = i + 1) {
      var custom_category_obj = custom_category_list[i];
      if (custom_category_obj && typeof custom_category_obj === "object" && String(custom_category_obj.name) === category_name_str) {
        return String(custom_category_obj.color || "#64748b");
      }
    }
  }

  return "#64748b";
}

function Get_All_Category_Names() {
  var category_name_map = {};
  var category_name_list = [];

  for (var i = 0; i < app_settings_default_category_name_list.length; i = i + 1) {
    var default_category_name_str = String(app_settings_default_category_name_list[i]);
    category_name_map[default_category_name_str] = true;
    category_name_list.push(default_category_name_str);
  }

  var custom_category_list = Read_Json_From_Storage(app_settings_custom_category_storage_key_str, []);
  if (Array.isArray(custom_category_list)) {
    for (var j = 0; j < custom_category_list.length; j = j + 1) {
      var custom_category_obj = custom_category_list[j];
      if (!custom_category_obj || typeof custom_category_obj !== "object") {
        continue;
      }

      var custom_category_name_str = String(custom_category_obj.name || "").trim();
      if (custom_category_name_str === "") {
        continue;
      }

      if (!category_name_map[custom_category_name_str]) {
        category_name_map[custom_category_name_str] = true;
        category_name_list.push(custom_category_name_str);
      }
    }
  }

  for (var k = 0; k < app_settings_history_key_list.length; k = k + 1) {
    var history_records_list = Read_Json_From_Storage(app_settings_history_key_list[k], []);
    if (!Array.isArray(history_records_list)) {
      continue;
    }

    for (var m = 0; m < history_records_list.length; m = m + 1) {
      var history_entry_obj = history_records_list[m];
      if (!history_entry_obj || typeof history_entry_obj !== "object") {
        continue;
      }

      if (typeof history_entry_obj.category === "string") {
        var normalized_history_category_str = Normalize_Category_Name(history_entry_obj.category);
        if (!category_name_map[normalized_history_category_str]) {
          category_name_map[normalized_history_category_str] = true;
          category_name_list.push(normalized_history_category_str);
        }
      }
    }
  }

  return category_name_list;
}

function Normalize_Category_Name(category_name_arg) {
  var normalized_name_str = String(category_name_arg);

  if (normalized_name_str === "Dining") {
    return "Food";
  }
  if (normalized_name_str === "Misc") {
    return "General";
  }
  if (normalized_name_str === "Supplies") {
    return "Shopping";
  }

  return normalized_name_str;
}

function Run_Category_Migration() {
  for (var i = 0; i < app_settings_history_key_list.length; i = i + 1) {
    var storage_key_str = app_settings_history_key_list[i];
    var history_list = Read_Json_From_Storage(storage_key_str, null);

    if (!Array.isArray(history_list)) {
      continue;
    }

    var key_changed_bool = false;
    var migrated_records_list = [];
    for (var j = 0; j < history_list.length; j = j + 1) {
      var record_obj = history_list[j];
      var migrated_record_obj = record_obj;

      if (record_obj && typeof record_obj === "object") {
        migrated_record_obj = Object.assign({}, record_obj);

        if (typeof migrated_record_obj.category === "string") {
          var next_category_name_str = Normalize_Category_Name(migrated_record_obj.category);
          if (next_category_name_str !== migrated_record_obj.category) {
            migrated_record_obj.category = next_category_name_str;
            key_changed_bool = true;
          }
        }
      }

      migrated_records_list.push(migrated_record_obj);
    }

    if (key_changed_bool === true) {
      localStorage.setItem(storage_key_str, JSON.stringify(migrated_records_list));
    }
  }

  var custom_category_list = Read_Json_From_Storage(app_settings_custom_category_storage_key_str, []);
  if (!Array.isArray(custom_category_list)) {
    return;
  }

  var reserved_category_name_list = ["Food", "General", "Shopping"];
  for (var k = 0; k < custom_category_list.length; k = k + 1) {
    var custom_category_entry = custom_category_list[k];
    if (!custom_category_entry || typeof custom_category_entry !== "object") {
      continue;
    }

    var custom_category_name_str = String(custom_category_entry.name);
    if (reserved_category_name_list.indexOf(custom_category_name_str) !== -1) {
      console.warn("_reserved category already exists in ledger_custom_cats_v3: " + custom_category_name_str);
    }
  }
}

function Apply_Saved_Name() {
  var raw_name_str = localStorage.getItem(app_settings_username_key_str);
  var display_name_str = app_settings_default_name_str;

  if (raw_name_str !== null) {
    display_name_str = String(raw_name_str).trim();
  }

  if (display_name_str === "") {
    display_name_str = app_settings_default_name_str;
  }

  var brand_name_el = document.getElementById("brand-name");
  if (brand_name_el) {
    brand_name_el.textContent = display_name_str;
  }

  return display_name_str;
}

Apply_Saved_Theme();
Run_Category_Migration();
Apply_Saved_Name();
