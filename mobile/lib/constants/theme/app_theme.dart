import 'package:flutter/material.dart';
import 'package:mobile/constants/colors.dart';
import 'package:mobile/constants/font_family.dart';
import 'package:mobile/constants/theme/text_theme.dart';

class AppTheme {
  AppTheme._();

  static final ThemeData lightTheme = ThemeData(
    fontFamily: FontFamily.roboto,
    textTheme: gicTextTheme,
    brightness: Brightness.light,
    // primarySwatch: MaterialColor(HorasColors.orange1, AppColors.orange),
    primaryColor: HorasColors.orange1,
    primaryColorLight: HorasColors.orange1,
    primaryColorDark: HorasColors.orange1,
    colorScheme: HorasColorscheme,
    errorColor: HorasColors.red,
    textButtonTheme: gicTextButtonTheme,
    outlinedButtonTheme: gicOutlineButtonTheme,
    elevatedButtonTheme: gicElevatedButtonTheme,
    scaffoldBackgroundColor: Colors.white,
    appBarTheme: gicAppBarTheme,
    dividerColor: HorasColors.black5,
    inputDecorationTheme: gicInputDecorationTheme,
    textSelectionTheme: gicTextSelectionTheme,
    toggleableActiveColor: HorasColors.orange1,
    tabBarTheme: gicTabBarTheme,
  );

  static final ThemeData darkTheme = lightTheme
    ..copyWith(
      brightness: Brightness.dark,
      primaryColor: HorasColors.orange1,
    );

  static TextTheme gicTextTheme = TextTheme(
    headline1: HorasTextStyle.h1,
    headline2: HorasTextStyle.h2,
    headline3: HorasTextStyle.h3,
    headline4: HorasTextStyle.h4,
    headline5: HorasTextStyle.h5,
    headline6: HorasTextStyle.h6,
    subtitle1: HorasTextStyle.body1,
    subtitle2: HorasTextStyle.body2,
    bodyText1: HorasTextStyle.body3,
    bodyText2: HorasTextStyle.body4,
    button: HorasTextStyle.button1,
    caption: HorasTextStyle.caption1,
  );

  static final gicTextButtonTheme = TextButtonThemeData(
    style: TextButton.styleFrom(
      foregroundColor: HorasColors.orange1,
    ),
  );

  static final gicOutlineButtonTheme = OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      foregroundColor: HorasColors.orange1,
    ),
  );

  static final gicElevatedButtonTheme = ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: HorasColors.orange1,
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 24),
      elevation: 0,
      textStyle: HorasTextStyle.h5.copyWith(color: HorasColors.white),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
    ),
  );

  static final gicAppBarTheme = AppBarTheme(
    backgroundColor: HorasColors.white,
    elevation: 1,
    titleTextStyle: HorasTextStyle.caption1.copyWith(color: Colors.orange),
    centerTitle: true,
    iconTheme: const IconThemeData(color: HorasColors.black),
  );

  static const gicInputDecorationTheme = InputDecorationTheme(
    focusColor: HorasColors.orange1,
    focusedBorder: UnderlineInputBorder(
      borderSide: BorderSide(color: HorasColors.orange1),
    ),
  );

  static const gicTextSelectionTheme = TextSelectionThemeData(
    cursorColor: HorasColors.orange1,
  );

  static final HorasColorscheme =
      ColorScheme.fromSwatch(primarySwatch: Colors.orange).copyWith(
    primary: HorasColors.orange1,
    onPrimary: HorasColors.white,
    secondary: HorasColors.orange1,
    onSecondary: HorasColors.white,
  );

  static const gicTabBarTheme = TabBarTheme(
    labelColor: HorasColors.black,
    indicator: BoxDecoration(
      border: Border(
        bottom: BorderSide(color: HorasColors.orange1, width: 2),
      ),
    ),
  );
}
