/**
 * 判断给定日期是否在当前时间之前或之后
 * @param date 需要比较的日期
 * @returns 如果日期在当前时间之前返回 true,否则返回 false
 */
export const isBeforeNow = (date: Date): boolean => {
  const now = new Date();
  return date.getTime() < now.getTime();
};
