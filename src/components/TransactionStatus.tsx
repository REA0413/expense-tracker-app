type StatusProps = {
  status: 'settled' | 'pending' | 'failed' | 'canceled';
};

export default function TransactionStatus({ status }: StatusProps) {
  let bgColor = '';
  let textColor = '';
  let label = '';
  
  switch (status) {
    case 'settled':
      bgColor = 'bg-green-100';
      textColor = 'text-green-800';
      label = 'Settlement';
      break;
    case 'pending':
      bgColor = 'bg-yellow-100';
      textColor = 'text-yellow-800';
      label = 'Pending';
      break;
    case 'failed':
      bgColor = 'bg-red-100';
      textColor = 'text-red-800';
      label = 'Failure';
      break;
    case 'canceled':
      bgColor = 'bg-gray-100';
      textColor = 'text-gray-800';
      label = 'Cancel';
      break;
  }
  
  return (
    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${bgColor} ${textColor}`}>
      {label}
    </span>
  );
} 