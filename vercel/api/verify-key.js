import { sendRequest } from './sendRequest.js';

export default async function handler(req, res) {
  const request = {
    ...req,
    body: {
      ...req.body,
      message: 'Respond with YES.',
      systemMessage: ''
    }
  }
  
  return await sendRequest(request, res);
}
