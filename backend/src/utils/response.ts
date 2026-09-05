export const sendSuccess = (res: any, data: any, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data,
  });
};

export const sendError = (
  res: any,
  statusCode: number,
  message: string,
  errors: any = null,
) => {
  const response: any = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};
