// preferences page js
// naming: functions are Name_Class (Capitalized_Snake), variables are snake_case with a type suffix

/* ==========================================================================
   CONSTANTS + STATE
   ========================================================================== */
var storage_key_history_str = "ledger_history";
var storage_key_legacy_history_str = "expense_tracker_history";
var storage_key_preferences_str = "expense_tracker_preferences";
var storage_key_budgets_str = "expense_tracker_budgets";
var storage_key_username_str = "expense_tracker_username";

var default_username_str = "User";
var default_theme_str = "theme_dark_warm";

var theme_name_list = [
  "theme_dark_cool",
  "theme_dark_warm",
  "theme_bright_cool",
  "theme_bright_warm"
];

var status_timer_map = {};

function Get_Budget_Category_List() {
  return Get_All_Category_Names();
}

/* ==========================================================================
   STORAGE HELPERS
   ========================================================================== */
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

function Write_Json_To_Storage(storage_key_arg_str, value_arg_obj) {
  localStorage.setItem(storage_key_arg_str, JSON.stringify(value_arg_obj));
}

function Show_Status_Message(status_el_id_str, message_arg_str, is_error_arg_bool) {
  var status_el = document.getElementById(status_el_id_str);
  if (!status_el) {
    return;
  }

  status_el.textContent = String(message_arg_str);

  if (is_error_arg_bool === true) {
    status_el.classList.add("Is_Error");
  } else {
    status_el.classList.remove("Is_Error");
  }

  if (status_timer_map[status_el_id_str]) {
    clearTimeout(status_timer_map[status_el_id_str]);
  }

  status_timer_map[status_el_id_str] = setTimeout(function() {
    status_el.textContent = "";
    status_el.classList.remove("Is_Error");
  }, 2500);
}

/* ==========================================================================
   1. OPERATOR IDENTITY
   ========================================================================== */
function Load_Operator_Name() {
  var raw_name_str = localStorage.getItem(storage_key_username_str);
  var clean_name_str = "";

  if (raw_name_str !== null) {
    clean_name_str = String(raw_name_str).trim();
  }

  if (clean_name_str === "") {
    clean_name_str = default_username_str;
  }

  return clean_name_str;
}

function Update_Brand_Tag(name_arg_str) {
  var brand_el = document.getElementById("brand-name");
  if (brand_el) {
    brand_el.textContent = String(name_arg_str);
  }
}

function Handle_Save_Name() {
  var name_input_el = document.getElementById("name-input");
  if (!name_input_el) {
    return;
  }

  var new_name_str = String(name_input_el.value).trim();
  if (new_name_str === "") {
    new_name_str = default_username_str;
  }

  localStorage.setItem(storage_key_username_str, new_name_str);
  name_input_el.value = new_name_str;
  Update_Brand_Tag(new_name_str);
  Show_Status_Message("name-status", "Saved", false);
}

/* ==========================================================================
   2. THEME PROFILES
   ========================================================================== */
function Is_Valid_Theme(theme_arg_str) {
  for (var i = 0; i < theme_name_list.length; i = i + 1) {
    if (theme_name_list[i] === String(theme_arg_str)) {
      return true;
    }
  }
  return false;
}

function Load_Saved_Theme() {
  var preferences_obj = Read_Json_From_Storage(storage_key_preferences_str, {});
  var saved_theme_str = default_theme_str;

  if (preferences_obj && typeof preferences_obj === "object") {
    if (Is_Valid_Theme(preferences_obj.theme)) {
      saved_theme_str = String(preferences_obj.theme);
    }
  }

  return saved_theme_str;
}

function Apply_Theme_To_Body(theme_arg_str) {
  for (var i = 0; i < theme_name_list.length; i = i + 1) {
    document.body.classList.remove(theme_name_list[i]);
  }
  document.body.classList.add(String(theme_arg_str));
}

function Update_Theme_Tile_Selection(theme_arg_str) {
  var tile_el_list = document.querySelectorAll(".Theme_Tile");

  for (var i = 0; i < tile_el_list.length; i = i + 1) {
    if (String(tile_el_list[i].getAttribute("data-theme")) === String(theme_arg_str)) {
      tile_el_list[i].classList.add("Is_Selected");
    } else {
      tile_el_list[i].classList.remove("Is_Selected");
    }
  }
}

function Handle_Theme_Tile_Click(theme_arg_str) {
  if (!Is_Valid_Theme(theme_arg_str)) {
    return;
  }

  Apply_Theme_To_Body(theme_arg_str);
  Update_Theme_Tile_Selection(theme_arg_str);

  var preferences_obj = Read_Json_From_Storage(storage_key_preferences_str, {});
  if (!preferences_obj || typeof preferences_obj !== "object") {
    preferences_obj = {};
  }
  preferences_obj.theme = String(theme_arg_str);
  Write_Json_To_Storage(storage_key_preferences_str, preferences_obj);

  Show_Status_Message("theme-status", "Theme saved", false);
}

/* ==========================================================================
   2.5 FX ENGINE
   ========================================================================== */
function Load_Active_Currency() {
  var preferences_obj = Read_Json_From_Storage(storage_key_preferences_str, {});
  var saved_currency_str = "INR";

  if (preferences_obj && typeof preferences_obj === "object") {
    if (typeof preferences_obj.currency === "string" && ["INR", "USD", "EUR", "GBP"].indexOf(preferences_obj.currency) !== -1) {
      saved_currency_str = String(preferences_obj.currency);
    }
  }

  return saved_currency_str;
}

function Save_Active_Currency(currency_arg_str) {
  var next_currency_str = "INR";
  if (["INR", "USD", "EUR", "GBP"].indexOf(String(currency_arg_str)) !== -1) {
    next_currency_str = String(currency_arg_str);
  }

  var preferences_obj = Read_Json_From_Storage(storage_key_preferences_str, {});
  if (!preferences_obj || typeof preferences_obj !== "object") {
    preferences_obj = {};
  }

  preferences_obj.currency = next_currency_str;
  Write_Json_To_Storage(storage_key_preferences_str, preferences_obj);

  var currency_select_el = document.getElementById("currency-select");
  if (currency_select_el) {
    currency_select_el.value = next_currency_str;
  }

  var fx_status_badge_el = document.getElementById("fx-status-badge");
  if (fx_status_badge_el) {
    fx_status_badge_el.textContent = next_currency_str;
  }

  Update_Fx_Badge();
}

function Update_Fx_Badge() {
  var fx_rate_badge_el = document.getElementById("fx-rate-badge");
  if (!fx_rate_badge_el) {
    return;
  }

  var target_currency_str = Get_Active_Currency_Code();
  var fx_rates_obj = Get_Fx_Rates();
  var rate_num = Number(fx_rates_obj[target_currency_str]);

  if (target_currency_str === "INR") {
    fx_rate_badge_el.textContent = "Base currency (INR)";
    return;
  }

  if (isNaN(rate_num) || rate_num <= 0) {
    fx_rate_badge_el.textContent = "Exchange rate unavailable";
    return;
  }

  fx_rate_badge_el.textContent = "1 INR = " + Number(rate_num).toFixed(4) + " " + target_currency_str;
}

function Fetch_Fx_Rates() {
  var cached_rates_obj = Read_Json_From_Storage("fx_exchange_rates_cache", null);
  if (cached_rates_obj && cached_rates_obj.rates) {
    Update_Fx_Badge();
    return;
  }

  fetch("https://api.frankfurter.app/latest?from=INR&to=USD,EUR,GBP")
    .then(function(response_obj) {
      if (!response_obj.ok) {
        throw new Error("Request failed");
      }
      return response_obj.json();
    })
    .then(function(payload_obj) {
      var normalised_rates = {
        INR: 1,
        USD: Number(payload_obj.rates && payload_obj.rates.USD) || 0.0120,
        EUR: Number(payload_obj.rates && payload_obj.rates.EUR) || 0.0111,
        GBP: Number(payload_obj.rates && payload_obj.rates.GBP) || 0.0104
      };

      localStorage.setItem("fx_exchange_rates_cache", JSON.stringify({ rates: normalised_rates, updated_at: new Date().toISOString() }));
      Update_Fx_Badge();
    })
    .catch(function() {
      var fallback_rates = { INR: 1, USD: 0.0120, EUR: 0.0111, GBP: 0.0104 };
      localStorage.setItem("fx_exchange_rates_cache", JSON.stringify({ rates: fallback_rates, updated_at: new Date().toISOString() }));
      Update_Fx_Badge();
    });
}

/* ==========================================================================
   3. BUDGET CAPS
   ========================================================================== */
function Format_Cap_Readout(value_arg_num) {
  return "Cap: \u20B9" + Number(value_arg_num).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

function Update_Budget_Readout(category_arg_str) {
  var input_el = document.getElementById("budget-input-" + category_arg_str);
  if (!input_el) {
    return;
  }

  var raw_value_str = String(input_el.value).trim();

  if (raw_value_str === "") {
    return;
  }

  var parsed_value_num = Number(raw_value_str);
  if (isNaN(parsed_value_num) || parsed_value_num < 0) {
    return;
  }
}

function Get_Category_Id(category_name_arg) {
  return String(category_name_arg || "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

function Render_Budget_Fields() {
  var stored_budget_obj = Read_Json_From_Storage(storage_key_budgets_str, {});
  if (!stored_budget_obj || typeof stored_budget_obj !== "object") {
    stored_budget_obj = {};
  }

  var budget_list_el = document.querySelector(".Budget_List");
  if (!budget_list_el) {
    return;
  }

  var category_name_list = Get_Budget_Category_List();
  var existing_row_map = {};
  var existing_row_el_list = budget_list_el.querySelectorAll(".Budget_Row");

  for (var i = 0; i < existing_row_el_list.length; i = i + 1) {
    var row_name_attr = existing_row_el_list[i].getAttribute("data-category");
    if (row_name_attr) {
      existing_row_map[row_name_attr] = existing_row_el_list[i];
    }
  }

  var row_names_to_keep = {};
  for (var j = 0; j < category_name_list.length; j = j + 1) {
    var category_str = category_name_list[j];
    row_names_to_keep[category_str] = true;

    var row_el = existing_row_map[category_str];
    if (!row_el) {
      row_el = document.createElement("div");
      row_el.className = "Budget_Row";
      row_el.setAttribute("data-category", category_str);

      var strip_el = document.createElement("span");
      strip_el.className = "Budget_Strip";
      strip_el.style.backgroundColor = Resolve_Category_Color(category_str);

      var body_el = document.createElement("div");
      body_el.className = "Budget_Body";

      var top_el = document.createElement("div");
      top_el.className = "Budget_Top";

      var name_el = document.createElement("span");
      name_el.className = "Budget_Name";
      name_el.textContent = category_str;

      var input_el = document.createElement("input");
      input_el.type = "number";
      input_el.className = "Pref_Input";
      input_el.id = "budget-input-" + category_str;
      input_el.min = "0";
      input_el.step = "1";
      input_el.inputMode = "numeric";
      input_el.placeholder = "0";
      input_el.setAttribute("data-category", category_str);

      (function(category_name_str, current_input_el) {
        current_input_el.addEventListener("input", function() {
          current_input_el.classList.remove("Is_Invalid");
          Update_Budget_Readout(category_name_str);
        });
      })(category_str, input_el);

      top_el.appendChild(name_el);
      body_el.appendChild(top_el);
      body_el.appendChild(input_el);
      row_el.appendChild(strip_el);
      row_el.appendChild(body_el);
      budget_list_el.appendChild(row_el);
    }

    var input_el = document.getElementById("budget-input-" + category_str);
    if (!input_el) {
      continue;
    }

    var stored_value_num = Number(stored_budget_obj[category_str]);
    if (stored_budget_obj[category_str] === undefined || isNaN(stored_value_num)) {
      input_el.value = "";
    } else {
      input_el.value = String(stored_value_num);
    }

    Update_Budget_Readout(category_str);
  }

  var row_el_list = budget_list_el.querySelectorAll(".Budget_Row");
  for (var k = 0; k < row_el_list.length; k = k + 1) {
    var row_category_name = row_el_list[k].getAttribute("data-category");
    if (!row_category_name || row_names_to_keep[row_category_name] !== true) {
      row_el_list[k].parentNode.removeChild(row_el_list[k]);
    }
  }
}

function Handle_Save_Budgets() {
  var new_budget_obj = {};
  var has_error_bool = false;
  var budget_category_list = Get_Budget_Category_List();

  for (var i = 0; i < budget_category_list.length; i = i + 1) {
    var category_str = budget_category_list[i];
    var input_el = document.getElementById("budget-input-" + category_str);
    if (!input_el) {
      continue;
    }

    input_el.classList.remove("Is_Invalid");

    var raw_value_str = String(input_el.value).trim();
    var parsed_value_num = 0;

    if (raw_value_str !== "") {
      parsed_value_num = Number(raw_value_str);
    }

    if (isNaN(parsed_value_num) || parsed_value_num < 0) {
      input_el.classList.add("Is_Invalid");
      has_error_bool = true;
    } else {
      new_budget_obj[category_str] = Math.round(parsed_value_num);
    }
  }

  if (has_error_bool === true) {
    Show_Status_Message("budget-status", "Enter valid amounts", true);
    return;
  }

  Write_Json_To_Storage(storage_key_budgets_str, new_budget_obj);
  Render_Budget_Fields();
  Show_Status_Message("budget-status", "Budget saved", false);
}

/* ==========================================================================
   4. DATA RESET
   ========================================================================== */
function Open_Reset_Modal() {
  var backdrop_el = document.getElementById("reset-backdrop");
  if (backdrop_el) {
    backdrop_el.classList.add("Is_Open");
  }
}

function Close_Reset_Modal() {
  var backdrop_el = document.getElementById("reset-backdrop");
  if (backdrop_el) {
    backdrop_el.classList.remove("Is_Open");
  }
}

function Handle_Confirm_Reset() {
  var default_preferences_obj = { theme: default_theme_str, currency: "INR" };

  localStorage.removeItem(storage_key_history_str);
  localStorage.removeItem(storage_key_legacy_history_str);
  localStorage.removeItem(storage_key_budgets_str);
  localStorage.removeItem("ledger_custom_cats_v3");
  localStorage.removeItem("fx_exchange_rates_cache");
  Write_Json_To_Storage(storage_key_preferences_str, default_preferences_obj);

  Close_Reset_Modal();
  window.location.reload();
}

/* ==========================================================================
   INIT
   ========================================================================== */
function Initialize_Preferences_Page() {
  var active_theme_str = Load_Saved_Theme();
  Apply_Theme_To_Body(active_theme_str);
  Update_Theme_Tile_Selection(active_theme_str);

  var operator_name_str = Load_Operator_Name();
  Update_Brand_Tag(operator_name_str);

  var active_currency_str = Load_Active_Currency();
  var currency_select_el = document.getElementById("currency-select");
  if (currency_select_el) {
    currency_select_el.value = active_currency_str;
    currency_select_el.addEventListener("change", function() {
      Save_Active_Currency(currency_select_el.value);
    });
  }

  Update_Fx_Badge();
  Fetch_Fx_Rates();

  var name_input_el = document.getElementById("name-input");
  if (name_input_el) {
    name_input_el.value = operator_name_str;
    name_input_el.addEventListener("keydown", function(event_obj) {
      if (event_obj.key === "Enter") {
        event_obj.preventDefault();
        Handle_Save_Name();
      }
    });
  }

  Render_Budget_Fields();

  // capsule nav (toggle_nav lives in shared/js/navbar.js)
  var capsule_btn_el = document.getElementById("capsule-btn");
  if (capsule_btn_el) {
    capsule_btn_el.addEventListener("click", function() {
      toggle_nav();
    });
  }

  var screen_mask_el = document.getElementById("screen-mask");
  if (screen_mask_el) {
    screen_mask_el.addEventListener("click", function() {
      toggle_nav(true);
    });
  }

  // identity
  var save_name_btn_el = document.getElementById("save-name-btn");
  if (save_name_btn_el) {
    save_name_btn_el.addEventListener("click", function() {
      Handle_Save_Name();
    });
  }

  // theme tiles
  var tile_el_list = document.querySelectorAll(".Theme_Tile");
  for (var i = 0; i < tile_el_list.length; i = i + 1) {
    (function(tile_el_arg) {
      tile_el_arg.addEventListener("click", function() {
        Handle_Theme_Tile_Click(String(tile_el_arg.getAttribute("data-theme")));
      });
    })(tile_el_list[i]);
  }

  var budget_category_list = Get_Budget_Category_List();
  for (var j = 0; j < budget_category_list.length; j = j + 1) {
    (function(category_arg_str) {
      var budget_input_el = document.getElementById("budget-input-" + category_arg_str);
      if (budget_input_el) {
        budget_input_el.addEventListener("input", function() {
          budget_input_el.classList.remove("Is_Invalid");
          Update_Budget_Readout(category_arg_str);
        });
      }
    })(budget_category_list[j]);
  }

  var save_budgets_btn_el = document.getElementById("save-budgets-btn");
  if (save_budgets_btn_el) {
    save_budgets_btn_el.addEventListener("click", function() {
      Handle_Save_Budgets();
    });
  }

  // danger zone
  var open_reset_btn_el = document.getElementById("open-reset-btn");
  if (open_reset_btn_el) {
    open_reset_btn_el.addEventListener("click", function() {
      Open_Reset_Modal();
    });
  }

  var reset_cancel_btn_el = document.getElementById("reset-cancel-btn");
  if (reset_cancel_btn_el) {
    reset_cancel_btn_el.addEventListener("click", function() {
      Close_Reset_Modal();
    });
  }

  var reset_confirm_btn_el = document.getElementById("reset-confirm-btn");
  if (reset_confirm_btn_el) {
    reset_confirm_btn_el.addEventListener("click", function() {
      Handle_Confirm_Reset();
    });
  }

  var reset_backdrop_el = document.getElementById("reset-backdrop");
  if (reset_backdrop_el) {
    reset_backdrop_el.addEventListener("click", function(event_obj) {
      if (event_obj.target === reset_backdrop_el) {
        Close_Reset_Modal();
      }
    });
  }

  document.addEventListener("keydown", function(event_obj) {
    if (event_obj.key === "Escape") {
      Close_Reset_Modal();
    }
  });
}

// apply the saved theme immediately (script sits at the end of <body>) to avoid a colour flash
Apply_Theme_To_Body(Load_Saved_Theme());

document.addEventListener("DOMContentLoaded", function() {
  Initialize_Preferences_Page();
});