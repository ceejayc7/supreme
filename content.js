chrome.runtime.sendMessage({ icon: "activate_icon" });

chrome.extension.onMessage.addListener((msg) => {
  if (msg?.addItemToCart) {
    addToCart(msg.addItemToCart);
  } else if (msg?.fillForm) {
    fillCheckout();
  } else if (msg?.removeFromCart?.item) {
    removeFromCart(msg.removeFromCart.item);
  }
});

const submitCheckout = () => {
  console.log("Submit checkout");
  chrome.runtime.sendMessage({ clearState: true });
  // document.getElementById("pay").getElementsByTagName("input")[0].click();
};

const fillCheckout = async () => {
  const data = await getPersonalData();
  document.getElementById(BILLING_NAME).value = data.name;
  document.getElementById(EMAIL).value = data.email;
  document.getElementById(PHONE_NUMBER).value = data.phone;
  document.getElementById(ADDRESS).value = data.address;
  document.getElementById(BILLING_ZIP).value = data.zip;
  document.getElementById(BILLING_CITY).value = data.city;
  document.getElementById(BILLING_STATE).value = data.state;
  document.getElementById(BILLING_COUNTRY).value = data.country;

  document.getElementById(CREDIT_CARD_NUMBER).value = data.creditCardNumber;
  document.getElementById(CREDIT_CARD_EXPIRATION_MONTH).value =
    data.expirationMonth;
  document.getElementById(CREDIT_CARD_EXPIRATION_YEAR).value =
    data.expirationYear;

  document.getElementById(CREDIT_CARD_SECURITY_CODE).value = data.securityCode;

  if (data.apt) {
    document.getElementById(APT).value = data.apt;
  }

  document.getElementsByClassName(TOS_CHECKBOX)[0].click();
};

const addToCart = (item) => {
  const endpoint = `${ITEM_ENDPOINT}/${item.itemId}/add.json`;
  const body = item.urlEncoded;

  return request(endpoint, "POST", body, item?.cookie).then((response) => {
    if (response.length) {
      console.log(`Added ${item.itemId} to cart`);
      if (item.isDummyItem) {
        chrome.runtime.sendMessage({ goToCheckout: item });
      } else {
        submitCheckout();
      }
    }
  });
};

const removeFromCart = (item) => {
  const endpoint = `${ITEM_ENDPOINT}/${item.itemId}/remove.json`;
  const body = `size=${item.size}`;

  return request(endpoint, "DELETE", body, item?.cookie).then((response) => {
    if (response.length) {
      console.log(`Removed ${item.itemId} from cart`);
    }
  });
};
