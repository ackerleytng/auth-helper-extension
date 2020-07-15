'use strict';

var settings = {
  config: {
    active: true,
    domain: 'httpbin.org',
    token: null,
    keycloakDomain: 'https://keycloak.localhost',
    realm: 'applications',
    username: 'user0',
    password: 'password',
    clientId: 'httpbin',
    clientSecret: '4e38706e-68ba-46aa-82d5-167244da84be',
  }
};

// Token updating

const toFormData = (o) => {
  const data = new URLSearchParams();
  Object.keys(o).map(k => data.append(k, o[k]))
  return data;
}

const getToken = ({domain, keycloakDomain, realm, username, password, clientId, clientSecret}) => {
  const url = `${keycloakDomain}/auth/realms/${realm}/protocol/openid-connect/token`;

  const data = {
    username,
    password,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'password',
  };

  return fetch(url, {
    method: 'post',
    body: toFormData(data)
  }).then(
    r => r.json()
      .then((json) => {
        if (r.ok) {
          return json.access_token;
        } else {
          throw json;
        }
      })
  );
}

const onMessageListener = ({action, message}, sender, sendResponse) => {
  if (sender.tab) {
    sendResponse({error: 'Not from extension'});
  }

  console.log({action, message});

  if (action.toLowerCase() === 'set') {
    // Update settings
    settings.config = {...settings.config, ...message};

    getToken(message)
      .then(t => {
        // Update token into settings
        settings.config.token = t;
        console.log({
          setConfig: settings.config
        });
        sendResponse({ config: settings.config });
      })
      .catch(details => {
        console.log({
          errorSetConfig: details
        });
        sendResponse({error: 'Error getting token', details});
      });

    // Wait before asynchronously using sendResponse
    return true;
  } else if (action.toLowerCase() === 'get') {
    console.log({
      getConfig: settings.config
    });
    sendResponse({
      config: settings.config
    });
  }

  // No need to wait to use sendResponse
  return false;
}

// Token injection

const beforeSendHeadersListener = ({url, requestHeaders}) => {
  if (!settings.config.active) {
    console.log({ignoring: url});
    return {requestHeaders};
  }

  const domain = settings.config.domain;
  if (url.match(domain) === null) {
    console.log({noMatching: url});
    return {requestHeaders};
  }

  // According to the docs, the Authorization header is never presented
  //   to extensions, so I'm just going to overwrite it
  requestHeaders.push({
    name: 'Authorization',
    value: `Bearer ${settings.config.token}`
  });

  return {requestHeaders};
};

// Setting up listeners

chrome.webRequest.onBeforeSendHeaders.addListener(
  beforeSendHeadersListener,
  {urls: ['<all_urls>']},
  ['blocking', 'requestHeaders']
);

chrome.runtime.onMessage.addListener(onMessageListener);
