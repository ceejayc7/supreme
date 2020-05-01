const MOBILE_STOCK_ENDPOINT =
  "https://www.supremenewyork.com/mobile_stock.json";
const ITEM_ENDPOINT = "https://www.supremenewyork.com/shop";
const CHECKOUT = "https://www.supremenewyork.com/checkout";
const POLLING_INTERVAL = 2000; // 2.5 seconds

// debug
const preferredItemNames = ["Military Trench Coat"];
const preferredSizes = ["Small", "Medium", "Large", "XLarge"];
const preferredColors = ["Black", "Olive Paisley", "Peach Paisley"];

/*
const preferredItemNames = ["Crewneck"];
const preferredSizes = ["Small", "Medium"];
const preferredColors = [
  "Natural",
  "Heather Grey",
  "Black",
  "Red",
  "Lime",
  "Violet",
]; */

let previousResponse = null;
let interval = null;
let isPolling = false;

const difference = (origObj, newObj) => {
  const changes = (newObj, origObj) => {
    let arrayIndexCounter = 0;
    return _.transform(newObj, (result, value, key) => {
      if (!_.isEqual(value, origObj[key])) {
        let resultKey = _.isArray(origObj) ? arrayIndexCounter++ : key;
        result[resultKey] =
          _.isObject(value) && _.isObject(origObj[key])
            ? changes(value, origObj[key])
            : value;
      }
    });
  };
  return changes(newObj, origObj);
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

const sendMessage = (message) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    for (const tab of tabs) {
      if (tab) {
        chrome.tabs.sendMessage(tab.id, message);
      }
    }
  });
};

const notifyContent = async (item, itemId) => {
  const cookie = await getCookie();
  sendMessage({ addItemToCart: { item, itemId, cookie } });
};

const getBestAvailableSizeAndColor = (response) => {
  const json = JSON.parse(response);
  for (const size of preferredSizes) {
    for (const color of preferredColors) {
      const item = getFilteredItem(json, color, size);
      if (!_.isEmpty(item)) {
        return item;
      }
    }
  }
  return null;
};

const goToCheckout = () => {
  return new Promise((resolve) => {
    const listener = (tabId, info) => {
      if (info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve(true);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.query({ currentWindow: true, active: true }, (tab) => {
      chrome.tabs.update(tab.id, { url: CHECKOUT });
    });
  });
};

const getCookie = () => {
  return new Promise((resolve) =>
    chrome.cookies.get(
      { url: "https://www.supremenewyork.com", name: "_supreme_sess" },
      (cookie) => {
        cookie ? resolve(cookie.value) : resolve();
      }
    )
  );
};

const fetchItemDetails = (itemId) => {
  return fetch(`${ITEM_ENDPOINT}/${itemId}.json`)
    .then((response) => response.text())
    .then(getBestAvailableSizeAndColor)
    .then((item) => {
      if (item) {
        notifyContent(item, itemId);
        return true;
      }
      return false;
    })
    .catch((err) => {
      console.error(err);
      return false;
    });
};

const isValidItemName = (item) => {
  if (!item?.name) {
    return false;
  }
  for (const preferredItem of preferredItemNames) {
    const cleanName = _.replace(item.name, /®/g, "").toLowerCase();
    if (cleanName.includes(preferredItem.toLowerCase())) {
      console.log(`Matched: "${item.name}" from "${preferredItem}"`);
      console.log(item);
      return true;
    }
  }
  return false;
};

const getMockData = () => {
  const url = chrome.runtime.getURL("mock.json");
  return fetch(url).then((response) => response.json());
};

const handleResponse = async (response) => {
  const json = JSON.parse(response);
  console.log(`${new Date().toISOString()}: Polling`);
  previousResponse = await getMockData();

  // debug to mock a new drop
  /*
  previousResponse = _.cloneDeep(JSON.parse(response));
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
  if (previousResponse === null) {
    console.log("Retrieved first API response to diff against");
    previousResponse = json;
    return;
  }
  const diff = difference(previousResponse, json);
  if (!_.isEmpty(diff)) {
    console.log("Diff found");
    console.log(diff);
    for (const itemType in diff?.products_and_categories) {
      for (const item of diff.products_and_categories[itemType]) {
        console.log("here1");
        if (isValidItemName(item)) {
          const isSuccessfulFetch = await fetchItemDetails(item.id);
          if (isSuccessfulFetch) {
            console.log("break");
            //break;
          }
        }
      }
    }
    clearState();
  } else {
    previousResponse = json;
  }
};

const pollForNewDrops = async () => {
  if (isPolling) {
    console.log("Already polling, skipping this run");
    return;
  }
  isPolling = true;
  await fetch(MOBILE_STOCK_ENDPOINT)
    .then((response) => response.text())
    .then(handleResponse)
    .catch(console.error);
  isPolling = false;
};

const setCheckboxState = (isEnabled) =>
  chrome.storage.sync.set({ checkbox: isEnabled });

const clearState = () => {
  clearInterval(interval);
  previousResponse = null;
  interval = null;
  isPolling = false;
  setCheckboxState(false);
  console.log("Supreme extension disabled");
};

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.icon === "activate_icon") {
    chrome.pageAction.show(sender.tab.id);
  } else if (message?.goToCheckout) {
    goToCheckout().then(() => sendMessage({ fillForm: true }));
  } else if ("checkbox" in message) {
    if (message.checkbox) {
      console.log("Supreme extension enabled");
      interval = setInterval(pollForNewDrops, POLLING_INTERVAL);
      pollForNewDrops();
    } else {
      clearState();
    }
    setCheckboxState(message.checkbox);
  }
});
