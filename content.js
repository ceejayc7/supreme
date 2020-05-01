const WEBSITE = "https://www.supremenewyork.com";
const ITEM_ENDPOINT = "https://www.supremenewyork.com/shop";
const UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 6_0 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/6.0 Mobile/10A5376e Safari/8536.25";
const localData = "info.json";

chrome.runtime.sendMessage({ icon: "activate_icon" });

chrome.extension.onMessage.addListener((msg) => {
  if (msg?.addItemToCart) {
    addToCart(msg.addItemToCart);
  } else if (msg?.fillForm) {
    fillCheckout();
  }
});

const getPersonalData = () => {
  const url = chrome.runtime.getURL(localData);
  return fetch(url).then((response) => response.json());
};

const fillCheckout = async () => {
  const data = await getPersonalData();
  document.getElementById("order_billing_name").value = data.name;
  document.getElementById("order_email").value = data.email;
  document.getElementById("order_tel").value = data.phone;
  document.getElementById("bo").value = data.address;
  document.getElementById("order_billing_zip").value = data.zip;
  document.getElementById("order_billing_city").value = data.city;
  document.getElementById("order_billing_state").value = data.state;
  document.getElementById("order_billing_country").value = data.country;

  document.getElementById("rnsnckrn").value = data.creditCardNumber;
  document.getElementById("credit_card_month").value = data.expirationMonth;
  document.getElementById("credit_card_year").value = data.expirationYear;

  document.getElementById("orcer").value = data.securityCode;

  document.getElementsByClassName("has-checkbox")[0].click();

  //document.getElementById("pay").getElementsByTagName("input")[0].click();
};

const addToCart = (item) => {
  const headers = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
      Accept: "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
    body: item.item.urlEncoded,
  };
  if (item.cookie) {
    headers.cookie = item.cookie;
  }
  return fetch(`${ITEM_ENDPOINT}/${item.itemId}/add.json`, headers)
    .then((response) => response.text())
    .then((response) => {
      if (response.length) {
        chrome.runtime.sendMessage({ goToCheckout: true });
      }
    });
};
