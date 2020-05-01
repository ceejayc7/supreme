const CHECKBOX_ID = "toggle";

const onClick = () => {
  chrome.tabs.getSelected(null, () => {
    chrome.runtime.sendMessage({
      checkbox: document.getElementById(CHECKBOX_ID).checked,
    });
  });
};

const toggle = () => {
  document.getElementById(CHECKBOX_ID).addEventListener("click", onClick);
};

const getCheckboxState = () => {
  chrome.storage.sync.get(["checkbox"], (result) => {
    document.getElementById(CHECKBOX_ID).checked = result.checkbox;
  });
};

document.addEventListener("DOMContentLoaded", () => {
  getCheckboxState();
  toggle();
});
