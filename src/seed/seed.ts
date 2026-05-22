/**
 * Script de seed para poblar la base de datos con datos iniciales.
 *
 * Uso:
 *   npm run seed
 *
 * Crea:
 *   - 3 niveles de soporte
 *   - 1 usuario admin
 *   - 3 técnicos con skills y niveles asignados
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { LevelsService } from '../levels/levels.service';
import { TechniciansService } from '../technicians/technicians.service';
import { TechnicianRole } from '../technicians/entities/technician.entity';
import { DataSource } from 'typeorm';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });

  const levelsService = app.get(LevelsService);
  const techniciansService = app.get(TechniciansService);
  const dataSource = app.get(DataSource);

  console.log('\n🌱 Iniciando seed...\n');

  // ─── Niveles ──────────────────────────────────────────────────────────────
  const existingLevels = await levelsService.findAll();

  if (existingLevels.length > 0) {
    console.log(`⚠️  Ya existen ${existingLevels.length} niveles — omitiendo seed de niveles.`);
  } else {
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
    console.log(`✅ ${levels.length} niveles creados`);
  }

  const [nivel1, nivel2, nivel3] = await levelsService.findAll();

  // ─── Técnicos ─────────────────────────────────────────────────────────────
  const existingTechs = await techniciansService.findAll();

  if (existingTechs.length > 0) {
    console.log(`⚠️  Ya existen ${existingTechs.length} técnicos — omitiendo seed de técnicos.`);
  } else {
    // Actualizar el rol directo en DB para el admin (TechniciansService no expone rol)
    const technicianRepo = dataSource.getRepository('tecnicos');

    const admin = await techniciansService.create({
      nombre: 'Administrador',
      email: 'admin@helpdesk.com',
      password: 'Admin1234!',
      nivel_id: nivel3.id,
      estado_activo: true,
      skills: ['architecture', 'devops', 'security'],
    });
    await technicianRepo.update(admin.id, { role: TechnicianRole.ADMIN });

    await techniciansService.create({
      nombre: 'Carlos Martínez',
      email: 'carlos@helpdesk.com',
      password: 'Tech1234!',
      nivel_id: nivel2.id,
      estado_activo: true,
      skills: ['React Native', 'Kotlin', 'Swift', 'payments', 'REST APIs'],
    });

    await techniciansService.create({
      nombre: 'Ana González',
      email: 'ana@helpdesk.com',
      password: 'Tech1234!',
      nivel_id: nivel2.id,
      estado_activo: true,
      skills: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
    });

    await techniciansService.create({
      nombre: 'Pedro Jiménez',
      email: 'pedro@helpdesk.com',
      password: 'Tech1234!',
      nivel_id: nivel1.id,
      estado_activo: true,
      skills: ['helpdesk', 'accounts', 'onboarding', 'Office365'],
    });

    console.log('✅ 4 usuarios creados');
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
  console.log('─────────────────────────────────────────\n');

  await app.close();
}

seed().catch((err) => {
  console.error('❌ Seed falló:', err);
  process.exit(1);
});
