"""
Rubik's Cube Scramble Generator
Generates WCA-compliant random scrambles for various cube sizes
"""

import random

class ScrambleGenerator:
    """Generate random scrambles for Rubik's Cube"""

    # Move definitions
    MOVES_3x3 = ['R', 'L', 'U', 'D', 'F', 'B']
    MODIFIERS = ['', '\'', '2']

    # Opposite faces (cannot be consecutive)
    OPPOSITES = {
        'R': 'L', 'L': 'R',
        'U': 'D', 'D': 'U',
        'F': 'B', 'B': 'F'
    }

    @staticmethod
    def generate_3x3(length=20):
        """
        Generate a 3x3x3 scramble

        Args:
            length (int): Number of moves in scramble (default: 20)

        Returns:
            str: Scramble notation (e.g., "R U R' U' F2 D'...")
        """
        scramble = []
        last_move = None

        for _ in range(length):
            available_moves = ScrambleGenerator.MOVES_3x3.copy()

            # Avoid consecutive moves on the same face (e.g., R R')
            if last_move and last_move in available_moves:
                available_moves.remove(last_move)

            # Avoid consecutive moves on opposite faces (e.g., R L R)
            # This prevents cancellation and makes scrambles more efficient
            if last_move:
                opposite = ScrambleGenerator.OPPOSITES.get(last_move)
                if opposite and opposite in available_moves:
                    available_moves.remove(opposite)

            # Choose random move and modifier
            move = random.choice(available_moves)
            modifier = random.choice(ScrambleGenerator.MODIFIERS)

            scramble.append(f"{move}{modifier}")
            last_move = move

        return ' '.join(scramble)

    @staticmethod
    def generate_2x2(length=9):
        """
        Generate a 2x2x2 scramble

        Args:
            length (int): Number of moves in scramble (default: 9)

        Returns:
            str: Scramble notation
        """
        # 2x2 uses only R, U, F moves
        moves_2x2 = ['R', 'U', 'F']
        scramble = []
        last_move = None

        for _ in range(length):
            available_moves = moves_2x2.copy()

            if last_move:
                available_moves.remove(last_move)

            move = random.choice(available_moves)
            modifier = random.choice(ScrambleGenerator.MODIFIERS)

            scramble.append(f"{move}{modifier}")
            last_move = move

        return ' '.join(scramble)

    @staticmethod
    def generate_4x4(length=40):
        """
        Generate a 4x4x4 scramble (includes wide moves)

        Args:
            length (int): Number of moves in scramble (default: 40)

        Returns:
            str: Scramble notation
        """
        moves_4x4 = ['R', 'L', 'U', 'D', 'F', 'B', 'Rw', 'Lw', 'Uw', 'Dw', 'Fw', 'Bw']
        opposites_4x4 = {
            'R': 'L', 'L': 'R', 'Rw': 'Lw', 'Lw': 'Rw',
            'U': 'D', 'D': 'U', 'Uw': 'Dw', 'Dw': 'Uw',
            'F': 'B', 'B': 'F', 'Fw': 'Bw', 'Bw': 'Fw'
        }

        scramble = []
        last_move = None

        for _ in range(length):
            available_moves = moves_4x4.copy()

            if last_move:
                # Remove same face
                available_moves.remove(last_move)
                # Remove opposite face
                opposite = opposites_4x4.get(last_move)
                if opposite in available_moves:
                    available_moves.remove(opposite)

            move = random.choice(available_moves)
            modifier = random.choice(ScrambleGenerator.MODIFIERS)

            scramble.append(f"{move}{modifier}")
            last_move = move

        return ' '.join(scramble)

    @staticmethod
    def generate(cube_type='3x3x3'):
        """
        Generate scramble for specified cube type

        Args:
            cube_type (str): Type of cube ('2x2x2', '3x3x3', '4x4x4')

        Returns:
            str: Scramble notation
        """
        generators = {
            '2x2x2': ScrambleGenerator.generate_2x2,
            '3x3x3': ScrambleGenerator.generate_3x3,
            '4x4x4': ScrambleGenerator.generate_4x4
        }

        generator = generators.get(cube_type, ScrambleGenerator.generate_3x3)
        return generator()
