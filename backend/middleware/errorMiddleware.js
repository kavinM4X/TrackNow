const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode;
  if (statusCode === 200) {
    statusCode = 500;
  }

  const response = {
    statusCode,
    message: err.message
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
