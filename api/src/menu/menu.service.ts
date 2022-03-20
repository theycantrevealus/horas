import { Injectable } from '@nestjs/common';
import { MenuModel } from 'src/model/menu.model';
import { Repository } from 'typeorm';
import { MenuAddDTO } from './dto/menu.add.dto';

@Injectable()
export class MenuService {
    constructor(
        private menuRepo: Repository<MenuModel>
    ) { }

}
