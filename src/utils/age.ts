export function calculateAge(birthDateString: string): string {
  if (!birthDateString) return '';
  
  const birthDate = new Date(birthDateString);
  const today = new Date();
  
  if (isNaN(birthDate.getTime())) return '';

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    // Get days in previous month
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return `${years} ปี ${months} เดือน ${days} วัน`;
}
