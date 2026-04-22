export const success = (data, statusCode = 200) => {
  return {
    statusCode,
    body: {
      success: true,
      data
    }
  };
};

export const error = (err) => {
  const statusCode = err.statusCode || 500;
  return {
    statusCode,
    body: {
      success: false,
      message: err.message
    }
  };
};
