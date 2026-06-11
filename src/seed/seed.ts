/**
 * Script de seed para poblar la base de datos con datos iniciales.
 *
 * Uso:
 *   npm run seed
 *
 * Crea:
 *   - 1 organización demo
 *   - 3 niveles de soporte
 *   - 1 usuario admin + 3 técnicos
 *   - 2 usuarios cliente de prueba
 */
import * as bcrypt from 'bcryptjs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { LevelsService } from '../levels/levels.service';
import { TechniciansService } from '../technicians/technicians.service';
import { UsersService } from '../users/users.service';
import { TechnicianRole } from '../technicians/entities/technician.entity';
import { DataSource } from 'typeorm';
import { Organization } from '../organizations/entities/organization.entity';
import { SuperAdmin } from '../super-admin/entities/super-admin.entity';
import { CategoriesService } from '../categories/categories.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const levelsService = app.get(LevelsService);
  const techniciansService = app.get(TechniciansService);
  const usersService = app.get(UsersService);
  const dataSource = app.get(DataSource);
  const orgRepo = dataSource.getRepository(Organization);
  const superAdminRepo = dataSource.getRepository(SuperAdmin);

  console.log('\n🌱 Iniciando seed...\n');

  // ─── Organización ─────────────────────────────────────────────────────────
  let org = await orgRepo.findOneBy({ slug: 'demo' });
  if (!org) {
    org = await orgRepo.save(orgRepo.create({ nombre: 'Empresa Demo', slug: 'demo', plan: 'trial' }));
    console.log('✅ Organización creada: Empresa Demo');
  } else {
    console.log('⚠️  Organización ya existe — omitiendo.');
  }

  // ─── Categorías de reclamo (idempotente) ──────────────────────────────────
  const categoriesService = app.get(CategoriesService);
  await categoriesService.seedDefaults(org.id);
  console.log('✅ Categorías de reclamo default verificadas.');

  // ─── Org demo "Nebroo" para la página /demo/nebroo.html ──────────────────
  let nebroo = await orgRepo.findOneBy({ slug: 'nebroo' });
  if (!nebroo) {
    nebroo = await orgRepo.save(
      orgRepo.create({
        nombre: 'Nebroo',
        slug: 'nebroo',
        plan: 'trial',
        company_type: 'ecommerce',
        portal_primary_color: '#2563eb',
        portal_language: 'en',
        portal_welcome_message:
          "Tell us what happened with your order and we'll get back to you shortly.",
        portal_order_label: 'Order number',
      }),
    );
    console.log('✅ Organización demo creada: Nebroo');
  }
  await categoriesService.seedDefaults(nebroo.id);

  // ─── Niveles ──────────────────────────────────────────────────────────────
  const existingLevels = await levelsService.findAll();

  if (existingLevels.length > 0) {
    console.log(`⚠️  Ya existen ${existingLevels.length} niveles — omitiendo seed de niveles.`);
  } else {
    const levelRepo = dataSource.getRepository('niveles');
    const levels = await Promise.all([
      levelsService.create({
        numero_nivel: 1,
        nombre: 'Soporte Básico',
        descripcion_responsabilidades:
          'Problemas de acceso, reseteo de contraseñas, configuración de cuentas, onboarding de usuarios, consultas generales de uso.',
        tags: ['access', 'accounts', 'onboarding', 'password', 'general'],
        max_complexity_score: 3,
      }),
      levelsService.create({
        numero_nivel: 2,
        nombre: 'Soporte Técnico',
        descripcion_responsabilidades:
          'Bugs en aplicaciones web y mobile, problemas de integración, errores de base de datos, módulo de pagos, APIs.',
        tags: ['web', 'mobile', 'bugs', 'database', 'payments', 'api', 'frontend', 'backend'],
        max_complexity_score: 7,
      }),
      levelsService.create({
        numero_nivel: 3,
        nombre: 'Ingeniería Avanzada',
        descripcion_responsabilidades:
          'Arquitectura, seguridad, performance crítica, infraestructura, incidentes de producción graves, pérdida de datos.',
        tags: ['security', 'infrastructure', 'performance', 'architecture', 'production-incident', 'devops'],
        max_complexity_score: 10,
      }),
    ]);
    // Asignar org_id a los niveles
    for (const level of levels) {
      await levelRepo.update(level.id, { org_id: org.id });
    }
    console.log(`✅ ${levels.length} niveles creados`);
  }

  const [nivel1, nivel2, nivel3] = await levelsService.findAll();

  // ─── Técnicos ─────────────────────────────────────────────────────────────
  const existingTechs = await techniciansService.findAll();

  if (existingTechs.length > 0) {
    console.log(`⚠️  Ya existen ${existingTechs.length} técnicos — omitiendo seed de técnicos.`);
  } else {
    const technicianRepo = dataSource.getRepository('tecnicos');

    const admin = await techniciansService.create({
      nombre: 'Administrador',
      email: 'admin@helpdesk.com',
      password: 'Admin1234!',
      nivel_id: nivel3.id,
      estado_activo: true,
      skills: ['architecture', 'devops', 'security'],
    });
    await technicianRepo.update(admin.id, { role: TechnicianRole.ADMIN, org_id: org.id });

    const carlos = await techniciansService.create({
      nombre: 'Carlos Martínez',
      email: 'carlos@helpdesk.com',
      password: 'Tech1234!',
      nivel_id: nivel2.id,
      estado_activo: true,
      skills: ['React Native', 'Kotlin', 'Swift', 'payments', 'REST APIs'],
    });
    await technicianRepo.update(carlos.id, { org_id: org.id });

    const ana = await techniciansService.create({
      nombre: 'Ana González',
      email: 'ana@helpdesk.com',
      password: 'Tech1234!',
      nivel_id: nivel2.id,
      estado_activo: true,
      skills: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
    });
    await technicianRepo.update(ana.id, { org_id: org.id });

    const pedro = await techniciansService.create({
      nombre: 'Pedro Jiménez',
      email: 'pedro@helpdesk.com',
      password: 'Tech1234!',
      nivel_id: nivel1.id,
      estado_activo: true,
      skills: ['helpdesk', 'accounts', 'onboarding', 'Office365'],
    });
    await technicianRepo.update(pedro.id, { org_id: org.id });

    console.log('✅ 4 técnicos/admin creados');
  }

  // ─── Usuarios cliente ──────────────────────────────────────────────────────
  const existingUsers = await usersService.findAll();

  if (existingUsers.length > 0) {
    console.log(`⚠️  Ya existen ${existingUsers.length} usuarios — omitiendo seed de usuarios.`);
  } else {
    await usersService.create({ nombre: 'Usuario Demo 1', email: 'usuario1@test.com', password: 'User1234!' }, org.id);
    await usersService.create({ nombre: 'Usuario Demo 2', email: 'usuario2@test.com', password: 'User1234!' }, org.id);
    console.log('✅ 2 usuarios cliente creados');
  }

  // ─── Super Admin ──────────────────────────────────────────────────────────
  const existingSa = await superAdminRepo.findOneBy({ email: 'superadmin@helpdesk.app' });
  if (!existingSa) {
    const password_hash = await bcrypt.hash('SuperAdmin1234!', 10);
    await superAdminRepo.save(superAdminRepo.create({ nombre: 'Super Admin', email: 'superadmin@helpdesk.app', password_hash }));
    console.log('✅ Super admin creado');
  } else {
    console.log('⚠️  Super admin ya existe — omitiendo.');
  }

  console.log('\n─────────────────────────────────────────');
  console.log('✅ Seed completado. Credenciales de acceso:');
  console.log('');
  console.log('  👑 Admin');
  console.log('     Email:    admin@helpdesk.com');
  console.log('     Password: Admin1234!');
  console.log('');
  console.log('  🔧 Técnicos (password: Tech1234!)');
  console.log('     carlos@helpdesk.com  — Nivel 2 (mobile, payments)');
  console.log('     ana@helpdesk.com     — Nivel 2 (web, backend)');
  console.log('     pedro@helpdesk.com   — Nivel 1 (soporte básico)');
  console.log('');
  console.log('  👤 Usuarios cliente (password: User1234!)');
  console.log('     usuario1@test.com');
  console.log('     usuario2@test.com');
  console.log('');
  console.log('  🔑 Super Admin');
  console.log('     superadmin@helpdesk.app / SuperAdmin1234!');
  console.log('─────────────────────────────────────────\n');

  await app.close();
}

seed().catch((err) => {
  console.error('❌ Seed falló:', err);
  process.exit(1);
});
