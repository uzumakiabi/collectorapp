import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  'Funko', 'Sports Cards', 'Books', 'Keychains', 'Kinder Toy',
  'Movie Cups', 'Coca Cola', 'Autographs', 'Posters', 'Other',
  'Figurines', 'Lego', '3D Puzzles', 'Caps', 'Magazines', 'Albums'
];

const CATEGORY_CUSTOM_FIELDS: Record<string, { name: string; fieldType: string }[]> = {
  'Funko': [{ name: 'Number', fieldType: 'text' }],
  'Books': [{ name: 'Author', fieldType: 'text' }],
  'Sports Cards': [
    { name: 'Player Name', fieldType: 'text' },
    { name: 'Year', fieldType: 'text' },
    { name: 'Card Number', fieldType: 'text' },
    { name: 'Brand/Set', fieldType: 'text' },
  ],
};

async function main() {
  const hashedPassword = await bcrypt.hash('johndoe123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      hashedPassword,
    },
  });

  for (const catName of DEFAULT_CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name: catName } },
      update: {},
      create: {
        name: catName,
        isDefault: true,
        userId: user.id,
      },
    });

    const fields = CATEGORY_CUSTOM_FIELDS[catName];
    if (fields) {
      for (const field of fields) {
        await prisma.customFieldDef.upsert({
          where: { categoryId_name: { categoryId: category.id, name: field.name } },
          update: {},
          create: {
            name: field.name,
            fieldType: field.fieldType,
            categoryId: category.id,
          },
        });
      }
    }

    // Create auto-folder per category
    await prisma.folder.upsert({
      where: { userId_categoryId: { userId: user.id, categoryId: category.id } },
      update: {},
      create: {
        name: catName,
        folderType: 'CATEGORY',
        categoryId: category.id,
        userId: user.id,
      },
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
