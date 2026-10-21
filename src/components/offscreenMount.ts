/**
 * ظرف آفسکرین برای مونت برگه هایی که رستر می شوند — خارج از دید است اما
 * چیدمان و فونت هایش کامل محاسبه می شود؛ خروجی های PDF/عکس از همین ها عکس
 * می گیرند. همه رانه های خروجی از همین استایل استفاده می کنند.
 */
export const OFFSCREEN_MOUNT_STYLE = {
  position: 'fixed',
  top: 0,
  left: -12000,
  width: 0,
  height: 0,
  overflow: 'visible',
} as const
