import { fetchXlmBalance, contractAddVault } from '../lib/stellar';
import { openWalletModal } from '../lib/stellar-kit';

jest.mock('../lib/stellar-kit', () => ({
  openWalletModal: jest.fn(),
}));

describe('Stellar Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchXlmBalance', () => {
    it('should return "0.0000" on a network error or missing account', async () => {
      // Mock global fetch to throw an error
      global.fetch = jest.fn(() => Promise.reject('Network Error')) as jest.Mock;

      const balance = await fetchXlmBalance('GDXY...MOCK');
      expect(balance).toBe('0.0000');
    });

    it('should return formatted balance on success', async () => {
      // Mock successful fetch
      global.fetch = jest.fn(() =>
        Promise.resolve({
          json: () => Promise.resolve({
            balances: [{ asset_type: 'native', balance: '100.1234567' }]
          })
        })
      ) as jest.Mock;

      const balance = await fetchXlmBalance('GDXY...MOCK');
      expect(balance).toBe('100.1235'); // rounded
    });
  });

  describe('contractAddVault', () => {
    it('should throw Error when wallet modal fails or is rejected', async () => {
      (openWalletModal as jest.Mock).mockRejectedValue(new Error('UserRejectedError'));

      await expect(contractAddVault('GDXY...MOCK')).rejects.toThrow('UserRejectedError');
    });
  });
});
