let state = {
  previousResponse: null,
  interval: null,
  isPolling: false,
};

const getFilteredItem = (json, color, size) => {
  const item = _.first(
    _.filter(json.styles, (item) =>
      item.name.toLowerCase().includes(color.toLowerCase())
    )
  );
  if (!_.isEmpty(item)) {
    const filteredSize = _.first(
      _.filter(
        item.sizes,
        (newItem) => newItem.name === size && newItem.stock_level > 0
      )
    );
    if (!_.isEmpty(filteredSize)) {
      console.log(`Found size: ${size} in color: ${color}`);
      console.log(`styleID: ${item.id} sizeID: ${filteredSize.id}`);
      console.log(json);
      return {
        style: item.id,
        size: filteredSize.id,
        urlEncoded: `st=${item.id}&s=${filteredSize.id}&qty=1`,
      };
    } else {
      console.log(`Could not find preferredSize: ${size} in ${color}`);
    }
  } else {
    console.log(`Could not find preferredColor: ${color}`);
  }
  return [];
};

const getAnyInStockConfiguration = (itemInfo) => {
  for (const style of itemInfo.styles) {
    const filteredStyles = _.filter(
      style.sizes,
      (item) => item.stock_level > 0
    );
    if (!_.isEmpty(filteredStyles)) {
      return {
        style: style.id,
        size: _.first(filteredStyles).id,
        urlEncoded: `st=${style.id}&s=${_.first(filteredStyles).id}&qty=1`,
      };
    }
  }
  return {};
};

const addMetadataToItem = async (item, itemId, isDummyItem) => {
  const cookie = await getCookie();
  item.cookie = cookie;
  item.itemId = itemId;
  item.isDummyItem = isDummyItem;
  return item;
};

const getRemovableItem = async (response) => {
  const listOfIds = getAllIds(response);
  for (const id of listOfIds) {
    const itemInfo = await getItemDetails(id);
    const item = getAnyInStockConfiguration(itemInfo);
    if (!_.isEmpty(item)) {
      return addMetadataToItem(item, id, true);
    }
  }
  return {};
};

const sendAddItemMsg = async (item) => {
  if (!_.isEmpty(item)) {
    sendMessage({ addItemToCart: item });
  }
};

const getBestAvailableSizeAndColor = (response) => {
  for (const size of config.preferredSizes) {
    for (const color of config.preferredColors) {
      const item = getFilteredItem(response, color, size);
      if (!_.isEmpty(item)) {
        return item;
      }
    }
  }
  return {};
};

const goToCheckout = (item) => {
  return new Promise((resolve) => {
    const listener = (tabId, info) => {
      if (info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        if (item) {
          sendMessage({ fillForm: true });
          sendMessage({ removeFromCart: { item } });
        }
        resolve(true);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.query({ currentWindow: true, active: true }, (tab) => {
      chrome.tabs.update(tab.id, { url: CHECKOUT });
    });
  });
};

const checkoutItem = (itemId, isDummyItem) => {
  return getItemDetails(itemId)
    .then(getBestAvailableSizeAndColor)
    .then((item) => addMetadataToItem(item, itemId, isDummyItem))
    .then(sendAddItemMsg)
    .catch(console.error);
};

const isValidItemName = (item) => {
  if (!item?.name) {
    return false;
  }
  for (const preferredItem of config.preferredItemNames) {
    const cleanName = _.replace(item.name, /®/g, "").toLowerCase();
    if (cleanName.includes(preferredItem.toLowerCase())) {
      console.log(`Matched: "${item.name}" from "${preferredItem}"`);
      console.log(item);
      return true;
    }
  }
  return false;
};

const addDummyItemToCart = async (response) => {
  const item = await getRemovableItem(response);
  console.log(`Adding dummy item ${item.itemId}`);
  sendAddItemMsg(item);
};

const handleResponse = async (response) => {
  console.log(`${new Date().toISOString()}: Polling`);

  // debug
  if (state.previousResponse !== null) {
    state.previousResponse = await getMockData();
  }

  // debug to mock a new drop
  /*
  state.previousResponse = _.cloneDeep(response);
  json.products_and_categories.Jackets.push({
    name: "Supreme®/New Era®/MLB Varsity Jacket",
    id: 173174,
    image_url: "//assets.supremenewyork.com/184855/ca/YM4aR2S3Mh0.jpg",
    image_url_hi: "//assets.supremenewyork.com/184855/rc/YM4aR2S3Mh0.jpg",
    price: 32800,
    sale_price: 0,
    new_item: true,
    position: 6,
    category_name: "Jackets",
  });
  json.products_and_categories.Jackets.push({
    name: "Quilted Cordura® Lined Jacket",
    id: 173175,
    image_url: "//assets.supremenewyork.com/185739/ca/o9vAOEycseo.jpg",
    image_url_hi: "//assets.supremenewyork.com/185739/rc/o9vAOEycseo.jpg",
    price: 21800,
    sale_price: 0,
    new_item: true,
    position: 7,
    category_name: "Jackets",
  });
  json.products_and_categories.Jackets.push({
    name: "Raglan Court Jacket",
    id: 173136,
    image_url: "//assets.supremenewyork.com/185954/ca/D4E7vR4__Q8.jpg",
    image_url_hi: "//assets.supremenewyork.com/185954/rc/D4E7vR4__Q8.jpg",
    price: 22800,
    sale_price: 0,
    new_item: false,
    position: 9,
    category_name: "Jackets",
  });
  json.products_and_categories.Shirts.push({
    name: "Bowling Zip S/S Shirt",
    id: 173140,
    image_url: "//assets.supremenewyork.com/185441/ca/yHl3_5v9a-A.jpg",
    image_url_hi: "//assets.supremenewyork.com/185441/rc/yHl3_5v9a-A.jpg",
    price: 12800,
    sale_price: 0,
    new_item: false,
    position: 10,
    category_name: "Shirts",
  });
  */

  // cannot diff on the first run
  if (state.previousResponse === null) {
    console.log("Retrieved first API response to diff against");
    await addDummyItemToCart(response);
    state.previousResponse = response;
    return;
  }

  const diff = difference(state.previousResponse, response);
  if (!_.isEmpty(diff)) {
    console.log("Diff found");
    console.log(diff);
    for (const itemType in diff?.products_and_categories) {
      for (const item of diff.products_and_categories[itemType]) {
        if (isValidItemName(item)) {
          checkoutItem(item.id, false);
        }
      }
    }
  } else {
    state.previousResponse = response;
  }
};

const pollForNewDrops = async () => {
  if (state.isPolling) {
    console.log("Already polling, skipping this run");
    return;
  }
  state.isPolling = true;
  await get(MOBILE_STOCK_ENDPOINT).then(handleResponse).catch(console.error);
  state.isPolling = false;
};

const clearState = () => {
  clearInterval(state.interval);
  state.previousResponse = null;
  state.interval = null;
  state.isPolling = false;
  setCheckboxState(false);
  console.log("Supreme extension disabled");
};

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.icon === "activate_icon") {
    chrome.pageAction.show(sender.tab.id);
  } else if (message?.goToCheckout) {
    goToCheckout(message?.goToCheckout);
  } else if (message?.clearState) {
    clearState();
  } else if ("checkbox" in message) {
    if (message.checkbox) {
      console.log("Supreme extension enabled");
      state.interval = setInterval(pollForNewDrops, config.POLLING_INTERVAL);
      pollForNewDrops();
    } else {
      clearState();
    }
    setCheckboxState(message.checkbox);
  }
});
