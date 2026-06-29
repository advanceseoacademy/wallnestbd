import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AdminAuthGuard } from '../auth/admin-auth.guard';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const bridge = require('../../../lib/adminApiBridge');

const rootDir = join(__dirname, '../../..');
const imageExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function uploadStorage(subdir: string) {
  return diskStorage({
    destination: join(rootDir, 'public', 'uploads', subdir),
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname).toLowerCase() || '.jpg';
      const safe = imageExt.includes(ext) ? ext : '.jpg';
      cb(null, `${uuidv4()}${safe}`);
    },
  });
}

@Controller()
@UseGuards(AdminAuthGuard)
export class AdminController {
  @Get('stats')
  async stats() {
    try {
      return await bridge.getStats();
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Get('orders')
  async orders() {
    try {
      return await bridge.getOrders();
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Patch('orders/:id')
  async patchOrder(@Param('id') id: string, @Body() body: Record<string, string>) {
    try {
      return await bridge.patchOrder(id, body);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Get('products')
  async products() {
    try {
      return await bridge.getProducts();
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Get('products/:id')
  async product(@Param('id') id: string) {
    try {
      return await bridge.getProduct(id);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('products')
  async createProduct(@Body() body: Record<string, unknown>) {
    try {
      return await bridge.createProduct(body);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Put('products/:id')
  async updateProduct(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>
  ) {
    try {
      return await bridge.updateProduct(id, body);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Delete('products/:id')
  async deleteProduct(@Param('id') id: string) {
    try {
      return await bridge.deleteProduct(id);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Get('categories')
  async categories() {
    try {
      return await bridge.getCategories();
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('categories')
  async createCategory(@Body() body: Record<string, unknown>) {
    try {
      return await bridge.createCategory(body);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Put('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>
  ) {
    try {
      return await bridge.updateCategory(id, body);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    try {
      return await bridge.deleteCategory(id);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: uploadStorage('products'),
      limits: { fileSize: 20 * 1024 * 1024 },
    })
  )
  async uploadProduct(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    try {
      return { ok: true, ...(await bridge.processProductUpload(file.path)) };
    } catch (e) {
      throw new BadRequestException(e.message || 'Image optimize failed');
    }
  }

  @Post('upload/category-hero')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: uploadStorage('categories'),
      limits: { fileSize: 20 * 1024 * 1024 },
    })
  )
  async uploadCategoryHero(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    try {
      return { ok: true, ...(await bridge.processCategoryUpload(file.path)) };
    } catch (e) {
      throw new BadRequestException(e.message || 'Image optimize failed');
    }
  }

  @Get('settings/payments')
  async paymentSettings() {
    return bridge.getPaymentSettings();
  }

  @Put('settings/payments')
  async updatePaymentSettings(@Body() body: { payments: unknown }) {
    try {
      return await bridge.updatePaymentSettings(body.payments);
    } catch (e) {
      throw new BadRequestException(e.message);
    }
  }
}
