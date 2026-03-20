import { sendRequest } from './sendRequest.js';

export default async function handler(req, res) {
  return await sendRequest(req, res);
}