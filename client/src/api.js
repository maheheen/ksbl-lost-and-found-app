// Thin wrapper around fetch for the REST API. Every failure becomes an ApiError with a
// plain-language message (and, for validation problems, a per-field `fields` map).

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

async function request(method, path, body) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check that it is running and try again.", 0);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!res.ok) {
    throw new ApiError((data && data.error) || "Something went wrong. Please try again.", res.status, data && data.errors);
  }
  return data;
}

export const api = {
  listItems: (filters = {}) => {
    // Only send filters that have a value.
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    return request("GET", `/items${qs ? `?${qs}` : ""}`);
  },
  getItem: (id) => request("GET", `/items/${id}`),
  createItem: (item) => request("POST", "/items", item),
  updateItem: (id, item) => request("PUT", `/items/${id}`, item),
  deleteItem: (id) => request("DELETE", `/items/${id}`),
  getMatches: (id) => request("GET", `/items/${id}/matches`),
  getMatchOverview: () => request("GET", "/matches"),
  confirmMatch: (lostId, foundId) => request("POST", `/items/${lostId}/confirm-match`, { foundId }),
  markReturned: (id) => request("POST", `/items/${id}/mark-returned`),
};
