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
