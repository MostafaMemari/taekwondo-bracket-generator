import { createContext, createElement, type ReactNode, useContext } from 'react'
import { classicTheme, type TableTheme } from './tableThemes.ts'

/**
 * کانتکست رنگ جدول — جدا از فایل داده ها تا قانون fast-refresh لمس نشود.
 * برگه ها با «TableThemeScope» فرزندانشان را رنگ می کنند؛ هر جای برنامه که
 * بیرون از scope مصرف شود تم کلاسیک برمی گردد — همان رنگ های همیشگی بوم قرعه.
 */
const TableThemeContext = createContext<TableTheme>(classicTheme)

export function TableThemeScope({
  theme,
  children,
}: {
  theme: TableTheme
  children: ReactNode
}) {
  return createElement(TableThemeContext.Provider, { value: theme }, children)
}

/** رنگ های فعلی جدول — داخل برگه تم انتخابی، بیرون برگه تم کلاسیک */
export function useTableTheme(): TableTheme {
  return useContext(TableThemeContext)
}
