import { CheckoutService } from '../src/services/CheckoutService.js';
import { Item } from '../src/domain/Item.js';
import { Pedido } from '../src/domain/Pedido.js';
import { UserMother } from './builders/UserMother.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';

describe('CheckoutService', () => {
    const cartao = { numero: '4111111111111111' };

    // Dummies: passados apenas para satisfazer o construtor; não devem ser chamados.
    const dummyRepository = () => ({ salvar: jest.fn() });
    const dummyEmailService = () => ({ enviarEmail: jest.fn() });

    describe('quando o pagamento falha', () => {
        it('deve retornar null (verificação de estado)', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder().build();
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: false }) };
            const checkoutService = new CheckoutService(
                gatewayStub,
                dummyRepository(),
                dummyEmailService()
            );

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, cartao);

            // Assert
            expect(pedido).toBeNull();
        });

        it('não deve salvar o pedido nem enviar e-mail', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder().build();
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: false }) };
            const repositoryMock = dummyRepository();
            const emailMock = dummyEmailService();
            const checkoutService = new CheckoutService(gatewayStub, repositoryMock, emailMock);

            // Act
            await checkoutService.processarPedido(carrinho, cartao);

            // Assert
            expect(repositoryMock.salvar).not.toHaveBeenCalled();
            expect(emailMock.enviarEmail).not.toHaveBeenCalled();
        });
    });

    describe('quando um cliente padrão finaliza a compra', () => {
        it('deve retornar o pedido salvo com o total sem desconto', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder()
                .comUser(UserMother.umUsuarioPadrao())
                .comItens([new Item('Teclado', 200)])
                .build();
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const pedidoSalvo = new Pedido(10, carrinho, 200, 'PROCESSADO');
            const repositoryStub = { salvar: jest.fn().mockResolvedValue(pedidoSalvo) };
            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryStub,
                dummyEmailService()
            );

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, cartao);

            // Assert
            expect(pedido).toBe(pedidoSalvo);
            expect(pedido.totalFinal).toBe(200);
            expect(pedido.status).toBe('PROCESSADO');
        });
    });

    describe('quando um cliente Premium finaliza a compra', () => {
        it('deve cobrar com 10% de desconto e enviar e-mail de aprovação', async () => {
            // Arrange
            const premium = UserMother.umUsuarioPremium();
            const carrinho = new CarrinhoBuilder()
                .comUser(premium)
                .comItens([new Item('Monitor', 150), new Item('Mouse', 50)]) // R$ 200,00
                .build();
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const pedidoSalvo = new Pedido(42, carrinho, 180, 'PROCESSADO');
            const repositoryStub = { salvar: jest.fn().mockResolvedValue(pedidoSalvo) };
            const emailMock = { enviarEmail: jest.fn().mockResolvedValue(undefined) };
            const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailMock);

            // Act
            await checkoutService.processarPedido(carrinho, cartao);

            // Assert (verificação de comportamento)
            expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, cartao);
            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
            expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                'premium@email.com',
                'Seu Pedido foi Aprovado!',
                'Pedido 42 no valor de R$180'
            );
        });
    });
});
