function deduplicateArray(arr1, arr2) {
  // 💡 Combine and deduplicate by key
  const allTickets = [...arr1, ...arr2];
  return Object.values(
    allTickets.reduce((acc, ticket) => {
      acc[ticket.key] = {
        ...(acc[ticket.key] || {}),
        ...ticket
      };
      return acc;
    }, {})
  );
}

export default { deduplicateArray };