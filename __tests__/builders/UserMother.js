import { User } from '../../src/domain/User.js';

/**
 * Object Mother: fábrica de usuários "prontos" e fixos.
 * Usuários mudam pouco entre os testes, então métodos estáticos bastam.
 */
export class UserMother {
    static umUsuarioPadrao() {
        return new User(1, 'Cliente Padrão', 'padrao@email.com', 'PADRAO');
    }

    static umUsuarioPremium() {
        return new User(2, 'Cliente Premium', 'premium@email.com', 'PREMIUM');
    }
}
