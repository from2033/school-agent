const SUB = {
  数学: { ink: '#0d6e6e', wash: '#e8f4f4' },
  语文: { ink: '#f59e0b', wash: '#fef3c7' },
  英语: { ink: '#6366f1', wash: '#e9eafe' },
  物理: { ink: '#e53e3e', wash: '#fee2e2' },
  化学: { ink: '#10b981', wash: '#d1fae5' },
  历史: { ink: '#ec4899', wash: '#fce7f3' },
};
const FALLBACK = { ink: '#0d6e6e', wash: '#e8f4f4' };

function sub(name) {
  return SUB[name] || FALLBACK;
}

module.exports = { SUB, sub, FALLBACK };
