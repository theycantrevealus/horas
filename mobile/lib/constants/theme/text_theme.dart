import 'package:flutter/material.dart';
import 'package:mobile/constants/colors.dart';
import 'package:mobile/constants/font_family.dart';

class HorasTextStyle {
  HorasTextStyle._();

  static const robotoFont = FontFamily.roboto;
  static const latoFont = FontFamily.lato;

  static const FontWeight weightRegular = FontWeight.w400;
  static const FontWeight weightMedium = FontWeight.w500;
  static const FontWeight weightBold = FontWeight.bold;

  static const Color colorDefault = HorasColors.black1;
  static const Color colorPrimary = HorasColors.orange1;

  static TextStyle h1 = const TextStyle(
    fontSize: 96,
    fontFamily: latoFont,
    fontWeight: weightRegular,
    color: colorDefault,
  );
  static TextStyle h2 = const TextStyle(
    fontSize: 60,
    fontFamily: latoFont,
    fontWeight: weightRegular,
    color: colorDefault,
  );
  static TextStyle h3 = const TextStyle(
    fontSize: 48,
    fontFamily: latoFont,
    fontWeight: weightRegular,
    color: colorDefault,
  );
  static TextStyle h4 = const TextStyle(
    fontSize: 24,
    fontFamily: latoFont,
    fontWeight: weightBold,
    color: colorDefault,
  );
  static TextStyle h5 = const TextStyle(
    fontSize: 18,
    fontFamily: latoFont,
    fontWeight: weightBold,
    color: colorDefault,
  );
  static TextStyle h6 = const TextStyle(
    fontSize: 14,
    fontFamily: latoFont,
    fontWeight: weightMedium,
    color: colorDefault,
  );
  static TextStyle h6Bold = const TextStyle(
    fontSize: 14,
    fontFamily: latoFont,
    fontWeight: weightBold,
    color: colorDefault,
  );
  static TextStyle h7 = const TextStyle(
    fontSize: 12,
    fontFamily: latoFont,
    fontWeight: weightMedium,
    color: colorDefault,
  );
  static TextStyle h8 = const TextStyle(
    fontSize: 10,
    fontFamily: latoFont,
    fontWeight: weightMedium,
    color: colorDefault,
  );

  static TextStyle body1 = const TextStyle(
    fontSize: 16,
    fontFamily: robotoFont,
    fontWeight: weightRegular,
    color: colorDefault,
  );
  static TextStyle body2 = const TextStyle(
    fontSize: 14,
    fontFamily: robotoFont,
    fontWeight: weightMedium,
    color: colorDefault,
  );
  static TextStyle body3 = const TextStyle(
    fontSize: 14,
    fontFamily: robotoFont,
    fontWeight: weightRegular,
    color: colorDefault,
  );
  static TextStyle body4 = const TextStyle(
    fontSize: 12,
    fontFamily: robotoFont,
    fontWeight: weightMedium,
    color: colorDefault,
  );
  static TextStyle body5 = const TextStyle(
    fontSize: 12,
    fontFamily: robotoFont,
    fontWeight: weightRegular,
    color: colorDefault,
  );

  static TextStyle button1 = const TextStyle(
    fontSize: 14,
    fontFamily: latoFont,
    fontWeight: weightMedium,
    color: colorDefault,
  );
  static TextStyle button2 = const TextStyle(
    fontSize: 12,
    fontFamily: robotoFont,
    fontWeight: weightMedium,
    color: colorDefault,
  );

  static TextStyle caption1 = const TextStyle(
    fontSize: 14,
    fontFamily: robotoFont,
    fontWeight: weightRegular,
    color: colorDefault,
  );
  static TextStyle caption2 = const TextStyle(
    fontSize: 8,
    fontFamily: robotoFont,
    fontWeight: weightMedium,
    color: colorDefault,
  );

  static TextStyle medium10 = const TextStyle(
    fontSize: 10,
    fontFamily: robotoFont,
    fontWeight: weightMedium,
    color: colorDefault,
  );

  static TextStyle label = const TextStyle(
    fontSize: 12,
    fontFamily: robotoFont,
    fontWeight: weightRegular,
    color: colorDefault,
  );
  static TextStyle label1 = const TextStyle(
    fontSize: 24,
    fontFamily: robotoFont,
    fontWeight: weightRegular,
    color: colorDefault,
  );
  static TextStyle label2 = const TextStyle(
    fontSize: 18,
    fontFamily: robotoFont,
    fontWeight: weightRegular,
    color: colorDefault,
  );

  static TextStyle labelButton = const TextStyle(
    fontSize: 12,
    fontFamily: robotoFont,
    fontWeight: weightBold,
    color: colorPrimary,
  );
}
