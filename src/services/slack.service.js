import axios from "axios";
import { constants } from "../helpers/constants.js";

export const oauth = async ({ code }) => {
  const data = new URLSearchParams({
    client_id: constants.SLACK.CLIENT_ID,
    client_secret: constants.SLACK.CLIENT_SECRET,
    code,
  });

  const options = {
    method: "POST",
    url: `${constants.SLACK.BASE_URL}/oauth.v2.access`,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    data: data,
    json: true,
  };

  try {
    const response = await axios(options);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log("OAUTH ERROR:", JSON.stringify(error.response, null, 2));
    return {
      success: false,
      message: error.response.data.message,
    };
  }
};

export const sendMessage = async ({
  channel,
  message = null,
  bot_access_token,
  ts = null,
  blocks = [],
}) => {
  const data = {
    channel: channel,
    text: message,
    thread_ts: ts,
    blocks: blocks,
  };

  try {
    const options = {
      method: "POST",
      url: `${constants.SLACK.BASE_URL}/chat.postMessage`,
      headers: {
        Authorization: `Bearer ${bot_access_token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      data: JSON.stringify(data),
      json: true,
    };
    const response = await axios(options);

    console.log(
      "SEND MESSAGE RESPONSE",
      JSON.stringify(response.data, null, 2)
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log("SEND MESSAGE ERROR:", JSON.stringify(error.response, null, 2));
    return {
      success: false,
      message: error.response.data.message,
    };
  }
};

export const sendEphemeralMessage = async ({
  channel,
  user,
  message,
  bot_access_token,
}) => {
  const data = {
    channel: channel,
    user: user,
    text: message,
    blocks: [
      {
        type: "section",
        block_id: "block_id_" + channel,
        text: {
          type: "mrkdwn",
          text: message,
        },
      },
    ],
  };

  try {
    const options = {
      method: "POST",
      url: `${constants.SLACK.BASE_URL}/chat.postEphemeral`,
      headers: {
        Authorization: `Bearer ${bot_access_token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      data: JSON.stringify(data),
      json: true,
    };
    const response = await axios(options);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log(
      "SEND EPHEMERAL MESSAGE ERROR:",
      JSON.stringify(error.response, null, 2)
    );
    return {
      success: false,
      message: error.response.data.message,
    };
  }
};

export const openModel = async ({ trigger_id, bot_access_token, template }) => {
  const body = {
    view: template,
    trigger_id: trigger_id,
  };

  const options = {
    method: "POST",
    url: `${constants.SLACK.BASE_URL}/views.open`,
    headers: {
      Authorization: `Bearer ${bot_access_token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    data: JSON.stringify(body),
    json: true,
  };
  try {
    const response = await axios(options);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log("OPEN MODEL ERROR:", JSON.stringify(error.response, null, 2));
    return {
      success: false,
      message: error.response.data.message,
    };
  }
};

export const updateModel = async ({ view_id, bot_access_token, template }) => {
  const body = {
    view_id: view_id,
    view: template,
  };

  const options = {
    method: "POST",
    url: `${constants.SLACK.BASE_URL}/views.update`,
    headers: {
      Authorization: `Bearer ${bot_access_token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    data: JSON.stringify(body),
    json: true,
  };
  try {
    const response = await axios(options);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log("UPDATE MODEL ERROR:", JSON.stringify(error.response, null, 2));
    return {
      success: false,
      message: error.response.data.message,
    };
  }
};

export const updateMessage = async ({
  channel,
  ts,
  text,
  blocks,
  user_access_token,
}) => {
  const data = {
    channel: channel,
    ts: ts,
    text: text,
    blocks: blocks,
  };

  try {
    const options = {
      method: "POST",
      url: `${constants.SLACK.BASE_URL}/chat.update`,
      headers: {
        Authorization: `Bearer ${user_access_token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      data: JSON.stringify(data),
      json: true,
    };

    const response = await axios(options);

    console.log(
      "UPDATE MESSAGE RESPONSE",
      JSON.stringify(response.data, null, 2)
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log(
      "UPDATE MESSAGE ERROR:",
      JSON.stringify(error.response, null, 2)
    );
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};

export const deleteMessage = async ({ channel, ts, bot_access_token }) => {
  try {
    const options = {
      method: "POST",
      url: `${constants.SLACK.BASE_URL}/chat.delete`,
      headers: {
        Authorization: `Bearer ${bot_access_token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      data: JSON.stringify({
        channel: channel,
        ts: ts,
      }),
      json: true,
    };
    const response = await axios(options);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log(
      "DELETE MESSAGE ERROR:",
      JSON.stringify(error.response, null, 2)
    );
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};

export const user = async ({ user_id, bot_access_token }) => {
  try {
    const options = {
      method: "GET",
      url: `${constants.SLACK.BASE_URL}/users.info?user=${user_id}`,
      headers: {
        Authorization: `Bearer ${bot_access_token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    };
    const response = await axios(options);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log("USER ERROR:", JSON.stringify(error.response, null, 2));
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};

export const channel = async ({ channel_id, bot_access_token }) => {
  try {
    const options = {
      method: "GET",
      url: `${constants.SLACK.BASE_URL}/conversations.info?channel=${channel_id}`,
      headers: {
        Authorization: `Bearer ${bot_access_token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
    };
    const response = await axios(options);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log("CHANNEL ERROR:", JSON.stringify(error.response, null, 2));
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};

export const openHomePage = async ({ user, bot_access_token, template }) => {
  const args = {
    token: bot_access_token,
    user_id: user,
    view: template,
  };

  const options = {
    method: "POST",
    url: `${constants.SLACK.BASE_URL}/views.publish`,
    headers: {
      Authorization: `Bearer ${bot_access_token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    data: JSON.stringify(args),
    json: true,
  };
  try {
    const response = await axios(options);
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.log(
      "OPEN HOME PAGE ERROR:",
      JSON.stringify(error.response, null, 2)
    );
    return {
      success: false,
      message: error.response?.data?.message || error.message,
    };
  }
};
