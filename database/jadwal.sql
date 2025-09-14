import java.util.Scanner;

public class PenghitungListrik {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);

        while (true) {
            System.out.println("Program penghitung pemakaian listrik sederhana");

            System.out.printf("%-35s: ", "Masukkan Nama");
            String nama = input.nextLine();

            System.out.printf("%-35s: ", "Kelurahan");
            String kelurahan = input.nextLine();

            System.out.printf("%-35s: ", "Masukkan posisi awal Kwh Meter");
            double posisi_awal = input.nextDouble();

            System.out.printf("%-35s: ", "Masukkan posisi akhir Kwh Meter");
            double posisi_akhir = input.nextDouble();

            System.out.printf("%-35s: ", "Masukkan biaya beban saat ini");
            double biaya_beban = input.nextDouble();

            System.out.printf("%-35s: ", "Masukkan PPJ (dalam persen)");
            double ppj_persen = input.nextDouble();

            input.nextLine();

            double pemakaian = posisi_akhir - posisi_awal;
            double tarif_listrik = pemakaian * biaya_beban;
            double ppj_rupiah = tarif_listrik * (ppj_persen / 100);
            double total_bayar = tarif_listrik + ppj_rupiah;

            System.out.println("===================================PLN " + kelurahan + "===================================");
            System.out.printf("%-22s: %s%n", "Nama", nama);
            System.out.printf("%-22s: %s%n", "Kelurahan", kelurahan);
            System.out.printf("%-22s: %.0f Kwh Meter%n", "Pemakaian bulan ini", pemakaian);
            System.out.printf("%-22s: Rp %,.0f,-%n", "Tarif Listrik", tarif_listrik);
            System.out.printf("%-22s: Rp %,.0f,-%n", "PPJ " + (int)ppj_persen + "%", ppj_rupiah);
            System.out.printf("%-22s: Rp %,.0f,-%n", "Total Bayar", total_bayar);
            System.out.println("================================================================================");

            System.out.println("\nLanjut menghitung ?");
            System.out.println("Ya : 1      |      Tidak : 2");
            System.out.print("Pilihan anda: ");

            String again = input.nextLine();
            if (again.equals("2")) {
                break;
            }

        }

        input.close();
        System.out.println("Terima kasih!");
    }
}