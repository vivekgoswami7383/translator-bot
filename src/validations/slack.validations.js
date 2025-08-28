import Joi from "joi";

export const redirectSchema = (data) => {
  const schema = Joi.object().keys({
    code: Joi.string().required(),
  });
  return schema.validate(data);
};

export const setTranslationSchema = (data) => {
  const schema = Joi.object().keys({
    primary: Joi.string().length(2).required(),
    target: Joi.string().length(2).required(),
  });
  return schema.validate(data);
};

export const eventSchema = (data) => {
  const schema = Joi.object().keys({
    type: Joi.string().required(),
    event: Joi.object().required(),
    team_id: Joi.string().required(),
  });
  return schema.validate(data);
};
