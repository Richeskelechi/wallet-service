export const sendSuccess = (
    data: object | Array<object>,
    message?: string,
  ): object => {
    return {
      status: 'success',
      message: message || 'Data fetched successfully',
      data,
    };
  };
  
  export const sendError = (message?: string): object => {
    return {
      status: 'error',
      message: message || 'An unknown error occurred',
    };
  };
  