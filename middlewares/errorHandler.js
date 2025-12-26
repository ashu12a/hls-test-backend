const errorHandler = (error, req, res, next) => {
  // default error
  let status = 500;
  let data = {
    message: "Internal Server Error",
  };

  if (error.isJoi) {
    status = 400; // Bad Request
    data.message = error.details.map((detail) => detail.message).join(", ");
    return res.status(status).json(data);
  }

  if (error.status) {
    status = error.status;
  }

  if (error.message) {
    data.message = error.message;
  }

  return res.status(status).json(data);
};

export default errorHandler;
