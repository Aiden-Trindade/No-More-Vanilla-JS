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
var app_settings_default_currency_str = "INR";
var app_settings_supported_currency_list = ["INR", "USD", "EUR", "GBP"];
var app_settings_currency_symbol_map = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£"
};
var app_settings_default_fx_rates = {
  INR: 1,
  USD: 0.0120,
  EUR: 0.0111,
  GBP: 0.0104
};

function Get_Active_Currency_Code() {
  var preferences_obj = Read_Json_From_Storage(app_settings_preferences_key_str, {});
  var active_currency_str = app_settings_default_currency_str;

  if (preferences_obj && typeof preferences_obj === "object") {
    if (typeof preferences_obj.currency === "string") {
      if (app_settings_supported_currency_list.indexOf(preferences_obj.currency) !== -1) {
        active_currency_str = String(preferences_obj.currency);
      }
    }
  }

  return active_currency_str;
}

function Get_Currency_Symbol(currency_code_arg_str) {
  var target_currency_str = String(currency_code_arg_str || Get_Active_Currency_Code());
  if (app_settings_currency_symbol_map[target_currency_str]) {
    return app_settings_currency_symbol_map[target_currency_str];
  }
  return app_settings_currency_symbol_map[app_settings_default_currency_str];
}

function Get_Fx_Rates() {
  var cached_rates_obj = Read_Json_From_Storage("fx_exchange_rates_cache", null);
  if (cached_rates_obj && typeof cached_rates_obj === "object" && cached_rates_obj.rates && typeof cached_rates_obj.rates === "object") {
    return cached_rates_obj.rates;
  }
  return app_settings_default_fx_rates;
}

function Format_Money_Amount(value_arg, currency_code_arg_str) {
  var amount_num = Number(value_arg);
  if (isNaN(amount_num)) {
    return "0.00";
  }

  var target_currency_str = String(currency_code_arg_str || Get_Active_Currency_Code());
  if (target_currency_str === "INR") {
    return Number(amount_num).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  var fx_rates_obj = Get_Fx_Rates();
  var rate_num = Number(fx_rates_obj[target_currency_str]);
  if (isNaN(rate_num) || rate_num <= 0) {
    rate_num = Number(app_settings_default_fx_rates[target_currency_str]);
  }

  var converted_amount_num = Number(amount_num) * Number(rate_num);
  return Number(converted_amount_num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

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

/* ==========================================================================
   PWA INSTALL
   Native prompt when the browser fires beforeinstallprompt, otherwise
   platform-detected manual steps. Hidden for good once the app is installed.
   ========================================================================== */
var app_settings_install_prompt_event = null;
var app_settings_installed_flag_key_str = "pet_app_installed";
var app_settings_banner_dismissed_key_str = "pet_install_banner_dismissed";

var app_settings_install_platform_label_map = {
  ios_safari: "iPhone / iPad \u00B7 Safari",
  ios_other: "iPhone / iPad",
  android_chrome: "Android",
  android_samsung: "Samsung Internet",
  inapp: "In-app browser",
  desktop: "Desktop",
  generic: "Your browser"
};

// storage can throw in some private / locked-down modes; the install UI must never break the app
function Safe_Local_Get(storage_key_arg_str) {
  try {
    return localStorage.getItem(storage_key_arg_str);
  } catch (error_obj) {
    return null;
  }
}

function Safe_Local_Set(storage_key_arg_str, value_arg_str) {
  try {
    localStorage.setItem(storage_key_arg_str, String(value_arg_str));
  } catch (error_obj) {
    // ignore: nothing here is user data
  }
}

function Safe_Local_Remove(storage_key_arg_str) {
  try {
    localStorage.removeItem(storage_key_arg_str);
  } catch (error_obj) {
    // ignore
  }
}

function Is_Running_Standalone() {
  if (window.navigator.standalone === true) {
    return true;
  }

  if (window.matchMedia) {
    var mode_list = ["standalone", "fullscreen", "minimal-ui"];
    for (var i = 0; i < mode_list.length; i = i + 1) {
      if (window.matchMedia("(display-mode: " + mode_list[i] + ")").matches) {
        return true;
      }
    }
  }

  return false;
}

function Detect_Install_Platform() {
  var user_agent_str = String(navigator.userAgent || "");
  var is_ios_bool = /iPad|iPhone|iPod/.test(user_agent_str);

  // iPadOS reports itself as a Mac
  if (!is_ios_bool && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
    is_ios_bool = true;
  }

  var is_android_bool = /Android/i.test(user_agent_str);

  // social / messenger webviews: they cannot install web apps
  var in_app_pattern = /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger|Snapchat|Twitter|TikTok|musical_ly|Bytedance|LinkedInApp|Pinterest|WhatsApp|GSA\/|; wv\)/i;
  if (in_app_pattern.test(user_agent_str)) {
    return "inapp";
  }

  if (is_ios_bool) {
    // iOS webviews have no "Safari/" token in the user agent
    if (!/Safari\//.test(user_agent_str)) {
      return "inapp";
    }
    if (/CriOS|FxiOS|EdgiOS|OPiOS|OPT\//.test(user_agent_str)) {
      return "ios_other";
    }
    return "ios_safari";
  }

  if (is_android_bool) {
    if (/SamsungBrowser/i.test(user_agent_str)) {
      return "android_samsung";
    }
    return "android_chrome";
  }

  if (/Windows|Macintosh|Linux|CrOS/.test(user_agent_str)) {
    return "desktop";
  }

  return "generic";
}

function Render_Install_Ui() {
  var card_el = document.getElementById("install-card");
  var banner_el = document.getElementById("pwa-install-banner");
  if (!card_el && !banner_el) {
    return;
  }

  var is_installed_bool = Is_Running_Standalone() || Safe_Local_Get(app_settings_installed_flag_key_str) === "1";

  if (card_el) {
    card_el.hidden = is_installed_bool;
  }
  if (banner_el) {
    banner_el.hidden = is_installed_bool || Safe_Local_Get(app_settings_banner_dismissed_key_str) === "1";
  }

  if (is_installed_bool || !card_el) {
    return;
  }

  var has_native_prompt_bool = app_settings_install_prompt_event !== null;
  var platform_str = Detect_Install_Platform();

  var install_btn_el = document.getElementById("pwa-install-btn");
  var guide_el = document.getElementById("install-guide");
  var copy_row_el = document.getElementById("install-copy-row");
  var platform_tag_el = document.getElementById("install-platform-tag");

  // a real prompt wins; manual steps are the fallback
  if (install_btn_el) {
    install_btn_el.hidden = !has_native_prompt_bool;
  }
  if (guide_el) {
    guide_el.hidden = has_native_prompt_bool;
  }

  var step_list_el = card_el.querySelectorAll(".Install_Steps");
  for (var i = 0; i < step_list_el.length; i = i + 1) {
    step_list_el[i].hidden = (step_list_el[i].getAttribute("data-platform") !== platform_str);
  }

  if (copy_row_el) {
    copy_row_el.hidden = !(platform_str === "inapp" || platform_str === "ios_other");
  }

  if (platform_tag_el) {
    platform_tag_el.textContent = app_settings_install_platform_label_map[platform_str] || "";
  }
}

function Handle_Install_Click(button_arg_el) {
  // no native prompt: send the user to the step-by-step guide
  if (app_settings_install_prompt_event === null) {
    var card_el = document.getElementById("install-card");
    if (card_el) {
      card_el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    var fallback_href_str = button_arg_el.getAttribute("data-fallback-href");
    if (fallback_href_str) {
      window.location.href = fallback_href_str;
    }
    return;
  }

  var prompt_event = app_settings_install_prompt_event;
  app_settings_install_prompt_event = null; // a prompt can only be used once
  prompt_event.prompt();

  prompt_event.userChoice
    .then(function(choice_obj) {
      if (choice_obj && choice_obj.outcome === "accepted") {
        Safe_Local_Set(app_settings_installed_flag_key_str, "1");
      }
      Render_Install_Ui();
    })
    .catch(function() {
      Render_Install_Ui();
    });
}

function Copy_App_Link() {
  var status_el = document.getElementById("install-copy-status");
  var app_url_str = new URL("../../", window.location.href).href;

  function show_result(message_str) {
    if (status_el) {
      status_el.textContent = message_str;
      setTimeout(function() {
        status_el.textContent = "";
      }, 2500);
    }
  }

  function legacy_copy() {
    var helper_el = document.createElement("textarea");
    helper_el.value = app_url_str;
    helper_el.setAttribute("readonly", "");
    helper_el.className = "Install_Sprite";
    document.body.appendChild(helper_el);
    helper_el.select();

    var copied_bool = false;
    try {
      copied_bool = document.execCommand("copy");
    } catch (error_obj) {
      copied_bool = false;
    }

    document.body.removeChild(helper_el);
    if (copied_bool) {
      show_result("Link copied");
    } else {
      show_result("Press and hold to copy: " + app_url_str);
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(app_url_str)
      .then(function() {
        show_result("Link copied");
      })
      .catch(legacy_copy);
  } else {
    legacy_copy();
  }
}

function Init_Install_Ui() {
  var card_install_btn_el = document.getElementById("pwa-install-btn");
  if (card_install_btn_el) {
    card_install_btn_el.addEventListener("click", function() {
      Handle_Install_Click(card_install_btn_el);
    });
  }

  var banner_install_btn_el = document.getElementById("pwa-banner-install-btn");
  if (banner_install_btn_el) {
    banner_install_btn_el.addEventListener("click", function() {
      Handle_Install_Click(banner_install_btn_el);
    });
  }

  var banner_dismiss_btn_el = document.getElementById("pwa-banner-dismiss-btn");
  if (banner_dismiss_btn_el) {
    banner_dismiss_btn_el.addEventListener("click", function() {
      Safe_Local_Set(app_settings_banner_dismissed_key_str, "1");
      Render_Install_Ui();
    });
  }

  var copy_link_btn_el = document.getElementById("install-copy-link-btn");
  if (copy_link_btn_el) {
    copy_link_btn_el.addEventListener("click", Copy_App_Link);
  }

  // react if the app gets installed / opened as an app while this page is open
  if (window.matchMedia) {
    var standalone_query = window.matchMedia("(display-mode: standalone)");
    if (standalone_query.addEventListener) {
      standalone_query.addEventListener("change", Render_Install_Ui);
    }
  }

  Render_Install_Ui();
}

// registered immediately: the event can arrive before DOMContentLoaded
window.addEventListener("beforeinstallprompt", function(event_obj) {
  event_obj.preventDefault();
  app_settings_install_prompt_event = event_obj;
  // the browser only fires this when the app is NOT installed, so clear any stale "installed" hint
  Safe_Local_Remove(app_settings_installed_flag_key_str);
  Render_Install_Ui();
});

window.addEventListener("appinstalled", function() {
  app_settings_install_prompt_event = null;
  Safe_Local_Set(app_settings_installed_flag_key_str, "1");
  Render_Install_Ui();
});

document.addEventListener("DOMContentLoaded", Init_Install_Ui);

/* ==========================================================================
   SERVICE WORKER
   ========================================================================== */
function Register_Service_Worker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
      var service_worker_url = new URL("../../sw.js", window.location.href).href;
      navigator.serviceWorker.register(service_worker_url)
        .then(function(reg) {
          console.log("PET Service Worker registered:", reg.scope);
        })
        .catch(function(err) {
          console.warn("PET Service Worker registration failed:", err);
        });
    });
  }
}

Register_Service_Worker();

/* ==========================================================================
   VISITOR COUNTER
   One keyless provider, written so it never throws and never logs errors.
   To switch provider later, only app_settings_counter_config_obj changes.
   ========================================================================== */
var app_settings_counter_config_obj = {
  base_url_str: "https://countapi.mileshilliard.com/api/v1",
  counter_key_str: "pet_expense_tracker_unique_visits",
  timeout_ms_num: 5000
};
var app_settings_visited_key_str = "pet_has_visited";
var app_settings_count_cache_key_str = "pet_visitor_count_cache";
var app_settings_visit_promise_obj = null;

function Parse_Count_Value(raw_value_arg) {
  if (typeof raw_value_arg !== "number" && typeof raw_value_arg !== "string") {
    return null;
  }
  if (String(raw_value_arg).trim() === "") {
    return null;
  }

  var parsed_num = Number(raw_value_arg);
  if (!isFinite(parsed_num) || parsed_num < 0) {
    return null;
  }

  return Math.floor(parsed_num);
}

// tolerant of the payload shape: 12, "12", {value:12}, {count:12}, {data:{value:12}} ...
function Extract_Count_From_Payload(payload_arg, depth_arg_num) {
  var direct_count = Parse_Count_Value(payload_arg);
  if (direct_count !== null) {
    return direct_count;
  }

  if (!payload_arg || typeof payload_arg !== "object" || (depth_arg_num || 0) > 1) {
    return null;
  }

  var key_list = ["value", "count", "total", "hits", "data", "result"];
  for (var i = 0; i < key_list.length; i = i + 1) {
    if (Object.prototype.hasOwnProperty.call(payload_arg, key_list[i])) {
      var found_count = Extract_Count_From_Payload(payload_arg[key_list[i]], (depth_arg_num || 0) + 1);
      if (found_count !== null) {
        return found_count;
      }
    }
  }

  return null;
}

// always resolves (number or null); a blocked / failed / slow request is just null
function Fetch_Counter_Value(action_arg_str) {
  return new Promise(function(resolve_fn) {
    var is_done_bool = false;
    var abort_controller_obj = null;

    if (typeof AbortController === "function") {
      abort_controller_obj = new AbortController();
    }

    function finish(value_arg) {
      if (is_done_bool) {
        return;
      }
      is_done_bool = true;
      clearTimeout(timer_id);
      resolve_fn(value_arg);
    }

    var timer_id = setTimeout(function() {
      if (abort_controller_obj) {
        abort_controller_obj.abort();
      }
      finish(null);
    }, app_settings_counter_config_obj.timeout_ms_num);

    var request_url_str = app_settings_counter_config_obj.base_url_str + "/" + action_arg_str + "/" +
      encodeURIComponent(app_settings_counter_config_obj.counter_key_str);

    var request_options_obj = {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer"
    };
    if (abort_controller_obj) {
      request_options_obj.signal = abort_controller_obj.signal;
    }

    try {
      fetch(request_url_str, request_options_obj)
        .then(function(response_obj) {
          if (!response_obj.ok) {
            return null;
          }
          return response_obj.text();
        })
        .then(function(text_str) {
          if (text_str === null || text_str === undefined) {
            finish(null);
            return;
          }

          var payload_value;
          try {
            payload_value = JSON.parse(text_str);
          } catch (parse_error) {
            payload_value = String(text_str).trim();
          }
          finish(Extract_Count_From_Payload(payload_value, 0));
        })
        .catch(function() {
          finish(null);
        });
    } catch (sync_error) {
      finish(null);
    }
  });
}

function Get_Cached_Visitor_Count() {
  return Parse_Count_Value(Safe_Local_Get(app_settings_count_cache_key_str));
}

function Format_Visitor_Count(count_arg_num) {
  return Number(count_arg_num).toLocaleString("en-US");
}

// New device: +1 once. Known device: read only. Resolves to a number or null, never rejects.
function Sync_Visitor_Count() {
  if (app_settings_visit_promise_obj !== null) {
    return app_settings_visit_promise_obj;
  }

  var action_str = "get";
  var is_new_device_bool = Safe_Local_Get(app_settings_visited_key_str) === null;

  if (is_new_device_bool) {
    action_str = "hit";
    // mark first so two quick page loads cannot both count this device
    Safe_Local_Set(app_settings_visited_key_str, "true");
  }

  app_settings_visit_promise_obj = Fetch_Counter_Value(action_str).then(function(count_num) {
    if (count_num === null) {
      // blocked or offline: let a new device try to be counted again next time
      if (is_new_device_bool) {
        Safe_Local_Remove(app_settings_visited_key_str);
      }
      return null;
    }

    Safe_Local_Set(app_settings_count_cache_key_str, count_num);
    return count_num;
  });

  return app_settings_visit_promise_obj;
}

// count a brand-new device on whichever page it opens first (not only Preferences)
if (Safe_Local_Get(app_settings_visited_key_str) === null) {
  Sync_Visitor_Count();
}