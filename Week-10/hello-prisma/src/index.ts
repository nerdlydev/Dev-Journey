import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

const prisma = new PrismaClient().$extends(withAccelerate());

async function main() {
  try {
    const newUser = await prisma.user.create({
      data: {
        name: 'Percy Prisma',
        email: 'percy@example.com',
      },
    });
    console.log('The new user:', newUser);

    const users = await prisma.user.findMany();
    console.log('All users:', users);

    const addTodo = await prisma.todo.create({
      data: {
        title: 'Learn Prisma',
        description: 'Learning to use Prisma with accelerate extension',
        userId: newUser.id,
        done: false,
      },
    });
    console.log('Added todo:', addTodo);

    const allTodos = await prisma.todo.findMany();
    console.log('All todos:', allTodos);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
