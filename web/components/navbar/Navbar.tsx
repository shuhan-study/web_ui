import Logo from './Logo';
import DarkMode from './DarkMode';
import Container from '@/components/global/Container';

function Navbar() {
  return (
    <nav className='border-b'>
      <Container className='flex flex-col sm:flex-row sm:justify-between sm:items-center flex-wrap gap-4 py-8'>
        <Logo />
        <div className='flex gap-4 items-center'>
          <DarkMode />
        </div>
      </Container>
    </nav>
  );
}

export default Navbar;
