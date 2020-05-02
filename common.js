//
// Background script utils
//
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

const get = (url) => fetch(url).then((response) => response.json());

const getItemDetails = (itemId) => get(`${ITEM_ENDPOINT}/${itemId}.json`);

const getCookie = () => {
  return new Promise((resolve) =>
    chrome.cookies.get({ url: DOMAIN, name: COOKIE_KEY }, (cookie) => {
      cookie ? resolve(cookie.value) : resolve();
    })
  );
};

const getAllIds = (response) => {
  let totalIds = [];

  const validItemTypes = ["Tops/Sweaters", "Sweatshirts", "Shirts", "Jackets"];
  const filteredResponse = _.pick(
    response.products_and_categories,
    validItemTypes
  );

  for (const itemType in filteredResponse) {
    const listOfIds = _.map(
      response.products_and_categories[itemType],
      (data) => data.id
    );
    totalIds = totalIds.concat(listOfIds);
  }
  return totalIds;
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

const sendAddItemMsg = (item) => {
  if (!_.isEmpty(item)) {
    sendMessage({ addItemToCart: item });
  }
};

const addMetadataToItem = async (item, itemId, isDummyItem) => {
  const cookie = await getCookie();
  item.cookie = cookie;
  item.itemId = itemId;
  item.isDummyItem = isDummyItem;
  return item;
};

const setCheckboxState = (isEnabled) =>
  chrome.storage.sync.set({ checkbox: isEnabled });

const getMockData = () => {
  const url = chrome.runtime.getURL("mock.json");
  return get(url);
};

//
// Content script utils
//
const getPersonalData = () => {
  const url = chrome.runtime.getURL(localData);
  return fetch(url).then((response) => response.json());
};

const request = (endpoint, method, body, cookie) => {
  const data = {
    method,
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": UA,
      Accept: "application/json",
      "x-requested-with": "XMLHttpRequest",
    },
  };
  if (cookie) {
    data.headers.cookie = cookie;
  }
  return fetch(endpoint, data).then((response) => response.text());
};
