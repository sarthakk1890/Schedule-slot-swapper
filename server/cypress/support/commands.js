function uniqueEmail(prefix = "user") {
  const suffix = Date.now() + Math.floor(Math.random() * 10000);
  return `${prefix}.${suffix}@test.local`;
}

Cypress.Commands.add("signup", (overrides = {}) => {
  const name = overrides.name || "Test User";
  const email = overrides.email || uniqueEmail("user");
  const password = overrides.password || "Password123!";

  return cy
    .request("POST", "/api/auth/signup", { name, email, password })
    .then((res) => {
      return {
        token: res.body.token,
        user: res.body.user,
        credentials: { name, email, password },
      };
    });
});

Cypress.Commands.add("login", ({ email, password }) => {
  return cy
    .request("POST", "/api/auth/login", { email, password })
    .then((res) => res.body.token);
});

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

Cypress.Commands.add("createEvent", (token, { title, startTime, endTime }) => {
  const body = {
    title: title || "Event",
    startTime: startTime || new Date(Date.now() + 3600_000).toISOString(),
    endTime: endTime || new Date(Date.now() + 7200_000).toISOString(),
  };
  return cy
    .request({
      method: "POST",
      url: "/api/events",
      body,
      headers: authHeaders(token),
    })
    .then((res) => res.body);
});

Cypress.Commands.add("setEventStatus", (token, eventId, status) => {
  return cy
    .request({
      method: "PUT",
      url: `/api/events/${eventId}`,
      body: { status },
      headers: authHeaders(token),
    })
    .then((res) => res.body);
});

Cypress.Commands.add("getMyEvents", (token) => {
  return cy
    .request({
      method: "GET",
      url: "/api/events/me",
      headers: authHeaders(token),
    })
    .then((res) => res.body);
});

Cypress.Commands.add("createSwap", (token, { mySlotId, theirSlotId }) => {
  return cy
    .request({
      method: "POST",
      url: "/api/swap-request",
      body: { mySlotId, theirSlotId },
      headers: authHeaders(token),
    })
    .then((res) => res.body);
});

Cypress.Commands.add("respondSwap", (token, requestId, accept) => {
  return cy
    .request({
      method: "POST",
      url: `/api/swap-response/${requestId}`,
      body: { accept },
      headers: authHeaders(token),
      failOnStatusCode: false,
    })
    .then((res) => res);
});

Cypress.Commands.add("getIncomingRequests", (token) => {
  return cy
    .request({
      method: "GET",
      url: "/api/swap-requests/incoming",
      headers: authHeaders(token),
    })
    .then((res) => res.body);
});
