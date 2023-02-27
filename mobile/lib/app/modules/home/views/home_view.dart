import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:mobile/app/modules/home/controllers/home_controller.dart';
import 'package:mobile/constants/constants.dart';

class HomeView extends GetView<HomeController> {
  const HomeView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('HomeView'),
        centerTitle: true,
      ),
      body: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'HORAS OK',
            style: HorasTextStyle.h4.copyWith(
              color: HorasColors.black,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'HORAS (Hospital Responsive Assistant System) is an open source hospital assistant system. It provide a very basic hospital management system that can help you to run your own medical center easily.',
            style: HorasTextStyle.label.copyWith(
              color: HorasColors.secondary,
            ),
          ),
        ],
      ).paddingAll(16),
    );
  }
}
