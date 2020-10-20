'use strict';

// https://stackoverflow.com/questions/38552003/how-to-decode-jwt-token-in-javascript-without-using-a-library
const parseJwt = (token) => {
  var base64Url = token.split('.')[1];
  var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  var jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' +
                         c.charCodeAt(0).toString(16)).slice(-2))
      .join(''));

  return JSON.parse(jsonPayload);
};

const fillState = (config) => {
  if (!config) {
    return;
  }

  [
    'domain', 'keycloakDomain', 'realm',
    'username', 'password', 'clientId', 'clientSecret'
  ].forEach(k => {
    if (config[k] !== undefined) {
      document.getElementById(k).value = config[k];
    }
  });

  document.getElementById('active').checked = config.active;

  if (config.token) {
    document.getElementById('token').value = config.token;
    const parsedToken = parseJwt(config.token);
    document.getElementById('payload').value =
      JSON.stringify(parsedToken, null, 2);
    document.getElementById('iat').value =
      new Date(parsedToken.iat * 1000).toString();
    document.getElementById('exp').value =
      new Date(parsedToken.exp * 1000).toString();
  }
}

const setConfig = (fieldName) => (e) => {
  const element = document.getElementById(fieldName);

  const value = element.type === 'checkbox'
        ? element.checked
        : element.value;

  const message = { fieldName, value };

  console.log({setConfig: message})

  chrome.runtime.sendMessage(
    {action: 'set', message},
    ({error, config, details}) => {
      if (error) {
        let msg = `Error: ${error}`;

        if (details) {
          const detailStr = JSON.stringify(details, null, 2);
          msg += `\nDetails:\n${detailStr}`;
        }

        document.getElementById('status').value = msg;
        return;
      }
    }
  )
};

const refreshToken = (e) => {
  chrome.runtime.sendMessage(
    {action: 'refresh'},
    ({error, config, details}) => {
      if (error) {
        let msg = `Error: ${error}`;

        if (details) {
          const detailStr = JSON.stringify(details, null, 2);
          msg += `\nDetails:\n${detailStr}`;
        }

        document.getElementById('status').value = msg;
        return;
      }

      fillState(config);
      document.getElementById('status').value = "Refreshed token!";
    }
  )
};

// Setup

chrome.runtime.sendMessage(
  {action: 'get'},
  ({config}) => { fillState(config); }
);
document.getElementById('getRefreshToken').onclick = refreshToken;
[
  'active', 'domain', 'keycloakDomain', 'realm',
  'username', 'password', 'clientId', 'clientSecret'
].forEach(k => {
  document.getElementById(k).addEventListener('input', setConfig(k));
});
